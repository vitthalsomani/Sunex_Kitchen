"""Item aliases map spelling variants (Achar/Aachar, Amchur/Amchoor) to one item.

Used to normalise names coming from the legacy sheet and future imports so stock
and cost never fragment across duplicate item names.
"""
import difflib
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.deps import CurrentUser, require_admin, require_any, require_master_write
from app.db.mongo import get_db
from app.models.common import oid_str, serialize, to_object_id
from app.models.schemas import ItemAliasCreate, ItemAliasOut
from app.services import cost

router = APIRouter(prefix="/item-aliases", tags=["item-aliases"])


async def _enrich(rows: list[dict]) -> list[dict]:
    db = get_db()
    ids = {to_object_id(r["item_id"]) for r in rows if r.get("item_id")}
    items = {
        oid_str(d["_id"]): d["name"]
        for d in await db.items.find({"_id": {"$in": list(ids)}}).to_list(None)
    }
    for r in rows:
        r["item_name"] = items.get(r.get("item_id"))
    return rows


@router.get("", response_model=list[ItemAliasOut])
async def list_aliases(_: Annotated[CurrentUser, Depends(require_any)]):
    db = get_db()
    docs = [serialize(d) for d in await db.item_aliases.find().sort("alias", 1).to_list(None)]
    return await _enrich(docs)


@router.post("", response_model=ItemAliasOut, status_code=status.HTTP_201_CREATED)
async def create_alias(
    payload: ItemAliasCreate, _: Annotated[CurrentUser, Depends(require_master_write)]
):
    db = get_db()
    doc = {"alias": payload.alias.strip(), "item_id": to_object_id(payload.item_id)}
    try:
        r = await db.item_aliases.insert_one(doc)
    except DuplicateKeyError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, "alias already mapped") from e
    doc["_id"] = r.inserted_id
    return (await _enrich([serialize(doc)]))[0]


@router.delete("/{alias_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alias(alias_id: str, _: Annotated[CurrentUser, Depends(require_master_write)]):
    db = get_db()
    res = await db.item_aliases.delete_one({"_id": to_object_id(alias_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "alias not found")


# ==================== curation tools ====================
def _suggest(name: str, canon: dict[str, str]) -> dict | None:
    """Best fuzzy canonical match for a name. canon = {name_lower: (id, name)}."""
    matches = difflib.get_close_matches(name.lower(), list(canon.keys()), n=1, cutoff=0.6)
    if not matches:
        return None
    _id, disp = canon[matches[0]]
    return {"item_id": _id, "name": disp}


@router.get("/review-items")
async def review_items(_: Annotated[CurrentUser, Depends(require_any)]):
    """Auto-created duplicate items (needs_review) with a suggested canonical match."""
    db = get_db()
    canon = {
        d["name"].lower(): (oid_str(d["_id"]), d["name"])
        for d in await db.items.find({"needs_review": {"$ne": True}}, {"name": 1}).to_list(None)
    }
    bmap = await cost.balances_from_ledger()
    out = []
    for it in await db.items.find({"needs_review": True}).sort("name", 1).to_list(None):
        out.append({
            "item_id": oid_str(it["_id"]),
            "name": it["name"],
            "balance": bmap.get(it["_id"], 0.0),
            "suggestion": _suggest(it["name"], canon),
        })
    return out


@router.get("/unmatched-purchases")
async def unmatched_purchases(_: Annotated[CurrentUser, Depends(require_any)]):
    """Distinct legacy purchase item-names that don't resolve to any item/alias."""
    db = get_db()
    known = {d["name"].strip().lower() for d in await db.items.find({}, {"name": 1}).to_list(None)}
    known |= {a["alias"].strip().lower() for a in await db.item_aliases.find({}, {"alias": 1}).to_list(None)}
    canon = {
        d["name"].lower(): (oid_str(d["_id"]), d["name"])
        for d in await db.items.find({"needs_review": {"$ne": True}}, {"name": 1}).to_list(None)
    }
    counts: dict[str, int] = {}
    async for p in db.legacy_purchases.find({}, {"item_name": 1}):
        nm = (p.get("item_name") or "").strip()
        if nm and nm.lower() not in known:
            counts[nm] = counts.get(nm, 0) + 1
    out = [
        {"name": nm, "count": c, "suggestion": _suggest(nm, canon)}
        for nm, c in sorted(counts.items(), key=lambda x: -x[1])
    ]
    return out


@router.post("/merge")
async def merge_items(
    _: Annotated[CurrentUser, Depends(require_admin)],
    source_item_id: str = Body(...),
    target_item_id: str = Body(...),
):
    """Merge a duplicate item into a canonical one: move ledger + cost layers, alias, delete."""
    db = get_db()
    src, tgt = to_object_id(source_item_id), to_object_id(target_item_id)
    if src == tgt:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "source and target are the same")
    src_doc = await db.items.find_one({"_id": src})
    tgt_doc = await db.items.find_one({"_id": tgt})
    if not src_doc or not tgt_doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item not found")
    await db.stock_ledger.update_many({"item_id": src}, {"$set": {"item_id": tgt}})
    await db.cost_layers.update_many({"item_id": src}, {"$set": {"item_id": tgt}})
    try:
        await db.item_aliases.insert_one({"alias": src_doc["name"], "item_id": tgt})
    except DuplicateKeyError:
        pass
    await db.items.delete_one({"_id": src})
    return {"merged": src_doc["name"], "into": tgt_doc["name"]}


@router.post("/reseed-valuation")
async def reseed_valuation(_: Annotated[CurrentUser, Depends(require_admin)]):
    """Rebuild opening cost layers so newly-aliased names contribute to valuation."""
    return await cost.seed_opening_layers()
