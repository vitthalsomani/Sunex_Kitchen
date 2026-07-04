from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.deps import CurrentUser, require_any, require_master_write
from app.db.mongo import get_db
from app.models.common import serialize, to_object_id
from app.models.schemas import VendorCreate, VendorOut, VendorUpdate

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=list[VendorOut])
async def list_vendors(_: Annotated[CurrentUser, Depends(require_any)]):
    db = get_db()
    return [serialize(d) for d in await db.vendors.find().sort("name", 1).to_list(None)]


@router.post("", response_model=VendorOut, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    payload: VendorCreate, _: Annotated[CurrentUser, Depends(require_master_write)]
):
    db = get_db()
    doc = payload.model_dump()
    try:
        r = await db.vendors.insert_one(doc)
    except DuplicateKeyError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, "vendor with this name exists") from e
    doc["_id"] = r.inserted_id
    return serialize(doc)


@router.patch("/{vendor_id}", response_model=VendorOut)
async def update_vendor(
    vendor_id: str,
    payload: VendorUpdate,
    _: Annotated[CurrentUser, Depends(require_master_write)],
):
    db = get_db()
    update = payload.model_dump(exclude_unset=True)
    if not update:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no fields to update")
    try:
        res = await db.vendors.find_one_and_update(
            {"_id": to_object_id(vendor_id)}, {"$set": update}, return_document=True
        )
    except DuplicateKeyError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, "duplicate vendor name") from e
    if res is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vendor not found")
    return serialize(res)


@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(vendor_id: str, _: Annotated[CurrentUser, Depends(require_master_write)]):
    db = get_db()
    res = await db.vendors.delete_one({"_id": to_object_id(vendor_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vendor not found")
