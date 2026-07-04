from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import CurrentUser, require_any, require_master_write
from app.db.mongo import get_db
from app.models.common import oid_str, serialize, to_object_id
from app.models.schemas import StaffCreate, StaffOut, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])


async def _enrich(rows: list[dict]) -> list[dict]:
    db = get_db()
    ids = {to_object_id(r["canteen_id"]) for r in rows if r.get("canteen_id")}
    canteens = {
        oid_str(d["_id"]): d["name"]
        for d in await db.canteens.find({"_id": {"$in": list(ids)}}).to_list(None)
    }
    for r in rows:
        r["canteen_name"] = canteens.get(r.get("canteen_id"))
    return rows


@router.get("", response_model=list[StaffOut])
async def list_staff(_: Annotated[CurrentUser, Depends(require_any)]):
    db = get_db()
    docs = [serialize(d) for d in await db.staff.find().sort("name", 1).to_list(None)]
    return await _enrich(docs)


@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
async def create_staff(
    payload: StaffCreate, _: Annotated[CurrentUser, Depends(require_master_write)]
):
    db = get_db()
    doc = payload.model_dump()
    doc["canteen_id"] = to_object_id(payload.canteen_id)
    r = await db.staff.insert_one(doc)
    doc["_id"] = r.inserted_id
    return (await _enrich([serialize(doc)]))[0]


@router.patch("/{staff_id}", response_model=StaffOut)
async def update_staff(
    staff_id: str, payload: StaffUpdate, _: Annotated[CurrentUser, Depends(require_master_write)]
):
    db = get_db()
    update: dict = {}
    for k, v in payload.model_dump(exclude_unset=True).items():
        update[k] = to_object_id(v) if k == "canteen_id" and v is not None else v
    if not update:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no fields to update")
    res = await db.staff.find_one_and_update(
        {"_id": to_object_id(staff_id)}, {"$set": update}, return_document=True
    )
    if res is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "staff not found")
    return (await _enrich([serialize(res)]))[0]


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(staff_id: str, _: Annotated[CurrentUser, Depends(require_master_write)]):
    db = get_db()
    res = await db.staff.delete_one({"_id": to_object_id(staff_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "staff not found")
