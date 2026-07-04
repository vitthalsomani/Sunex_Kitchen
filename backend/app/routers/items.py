from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.deps import CurrentUser, require_admin, require_any
from app.db.mongo import get_db
from app.models.common import oid_str, serialize, to_object_id
from app.models.schemas import ItemCreate, ItemOut, ItemUpdate

router = APIRouter(prefix="/items", tags=["items"])


async def _enrich(items: list[dict]) -> list[dict]:
    db = get_db()
    cat_ids = {to_object_id(i["category_id"]) for i in items if i.get("category_id")}
    unit_ids = {to_object_id(i["unit_id"]) for i in items if i.get("unit_id")}
    cats = {
        oid_str(d["_id"]): d["name"]
        for d in await db.item_categories.find({"_id": {"$in": list(cat_ids)}}).to_list(None)
    }
    units = {
        oid_str(d["_id"]): d["name"]
        for d in await db.units.find({"_id": {"$in": list(unit_ids)}}).to_list(None)
    }
    for i in items:
        i["category_name"] = cats.get(i.get("category_id"))
        i["unit_name"] = units.get(i.get("unit_id"))
    return items


@router.get("", response_model=list[ItemOut])
async def list_items(_: Annotated[CurrentUser, Depends(require_any)]):
    db = get_db()
    docs = [serialize(d) for d in await db.items.find().sort("name", 1).to_list(None)]
    return await _enrich(docs)


@router.post("", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(payload: ItemCreate, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    doc = {
        "name": payload.name,
        "category_id": to_object_id(payload.category_id),
        "unit_id": to_object_id(payload.unit_id),
        "min_stock": payload.min_stock,
        "max_stock": payload.max_stock,
        "active": payload.active,
    }
    try:
        r = await db.items.insert_one(doc)
    except DuplicateKeyError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, "item exists in this category") from e
    doc["_id"] = r.inserted_id
    return (await _enrich([serialize(doc)]))[0]


@router.patch("/{item_id}", response_model=ItemOut)
async def update_item(
    item_id: str, payload: ItemUpdate, _: Annotated[CurrentUser, Depends(require_admin)]
):
    db = get_db()
    update: dict = {}
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if k in ("category_id", "unit_id") and v is not None:
            update[k] = to_object_id(v)
        else:
            update[k] = v
    if not update:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no fields to update")
    try:
        res = await db.items.find_one_and_update(
            {"_id": to_object_id(item_id)}, {"$set": update}, return_document=True
        )
    except DuplicateKeyError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, "duplicate item in category") from e
    if res is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item not found")
    return (await _enrich([serialize(res)]))[0]


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: str, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    res = await db.items.delete_one({"_id": to_object_id(item_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item not found")
