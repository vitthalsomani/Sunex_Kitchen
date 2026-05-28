from datetime import date, datetime, time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser, require_admin, require_any, require_entry
from app.db.mongo import get_db
from app.models.common import oid_str, serialize, to_object_id
from app.models.schemas import PurchaseCreate, PurchaseOut, PurchaseUpdate

router = APIRouter(prefix="/purchases", tags=["purchases"])


def _to_dt(d: date) -> datetime:
    return datetime.combine(d, time.min)


async def _enrich(docs: list[dict]) -> list[dict]:
    db = get_db()
    item_ids = {to_object_id(d["item_id"]) for d in docs if d.get("item_id")}
    items = {
        oid_str(d["_id"]): d
        for d in await db.items.find({"_id": {"$in": list(item_ids)}}).to_list(None)
    }
    cat_ids = {i["category_id"] for i in items.values() if i.get("category_id")}
    unit_ids = {i["unit_id"] for i in items.values() if i.get("unit_id")}
    cats = {
        oid_str(d["_id"]): d["name"]
        for d in await db.item_categories.find({"_id": {"$in": list(cat_ids)}}).to_list(None)
    }
    units = {
        oid_str(d["_id"]): d["name"]
        for d in await db.units.find({"_id": {"$in": list(unit_ids)}}).to_list(None)
    }
    for d in docs:
        if isinstance(d.get("date"), datetime):
            d["date"] = d["date"].date()
        item = items.get(d.get("item_id"))
        if item:
            d["item_name"] = item.get("name")
            d["category_id"] = oid_str(item.get("category_id"))
            d["unit_name"] = units.get(oid_str(item.get("unit_id")))
            d["category_name"] = cats.get(d["category_id"])
    return docs


@router.get("", response_model=list[PurchaseOut])
async def list_purchases(
    _: Annotated[CurrentUser, Depends(require_any)],
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
):
    db = get_db()
    q: dict = {}
    if month:
        year, mon = (int(x) for x in month.split("-"))
        start = datetime(year, mon, 1)
        end = datetime(year + (mon // 12), (mon % 12) + 1, 1)
        q["date"] = {"$gte": start, "$lt": end}
    else:
        rng: dict = {}
        if from_date:
            rng["$gte"] = _to_dt(from_date)
        if to_date:
            rng["$lte"] = _to_dt(to_date)
        if rng:
            q["date"] = rng
    docs = [serialize(d) for d in await db.purchases.find(q).sort("date", -1).to_list(None)]
    return await _enrich(docs)


@router.post("", response_model=PurchaseOut, status_code=status.HTTP_201_CREATED)
async def create(payload: PurchaseCreate, _: Annotated[CurrentUser, Depends(require_entry)]):
    db = get_db()
    doc = {
        "date": _to_dt(payload.date),
        "item_id": to_object_id(payload.item_id),
        "quantity": payload.quantity,
        "rate": payload.rate,
        "amount": round(payload.quantity * payload.rate, 2),
        "vendor": payload.vendor,
        "bill_ref": payload.bill_ref,
        "notes": payload.notes,
    }
    r = await db.purchases.insert_one(doc)
    doc["_id"] = r.inserted_id
    return (await _enrich([serialize(doc)]))[0]


@router.patch("/{purchase_id}", response_model=PurchaseOut)
async def update(
    purchase_id: str,
    payload: PurchaseUpdate,
    _: Annotated[CurrentUser, Depends(require_entry)],
):
    db = get_db()
    data = payload.model_dump(exclude_unset=True)
    update: dict = {}
    for k, v in data.items():
        if k == "date" and v is not None:
            update[k] = _to_dt(v)
        elif k == "item_id" and v is not None:
            update[k] = to_object_id(v)
        else:
            update[k] = v
    if not update:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no fields to update")
    # Recompute amount if quantity or rate changed
    existing = await db.purchases.find_one({"_id": to_object_id(purchase_id)})
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "purchase not found")
    qty = update.get("quantity", existing["quantity"])
    rate = update.get("rate", existing["rate"])
    update["amount"] = round(qty * rate, 2)
    res = await db.purchases.find_one_and_update(
        {"_id": to_object_id(purchase_id)}, {"$set": update}, return_document=True
    )
    return (await _enrich([serialize(res)]))[0]


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(purchase_id: str, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    res = await db.purchases.delete_one({"_id": to_object_id(purchase_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "purchase not found")
