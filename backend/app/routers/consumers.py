from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.deps import CurrentUser, require_any, require_master_write
from app.db.mongo import get_db
from app.models.common import serialize, to_object_id
from app.models.schemas import ConsumerCreate, ConsumerOut, ConsumerUpdate

router = APIRouter(prefix="/consumers", tags=["consumers"])


@router.get("", response_model=list[ConsumerOut])
async def list_consumers(_: Annotated[CurrentUser, Depends(require_any)]):
    db = get_db()
    return [serialize(d) for d in await db.consumers.find().sort("name", 1).to_list(None)]


@router.post("", response_model=ConsumerOut, status_code=status.HTTP_201_CREATED)
async def create_consumer(
    payload: ConsumerCreate, _: Annotated[CurrentUser, Depends(require_master_write)]
):
    db = get_db()
    doc = payload.model_dump()
    try:
        r = await db.consumers.insert_one(doc)
    except DuplicateKeyError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, "consumer with this name exists") from e
    doc["_id"] = r.inserted_id
    return serialize(doc)


@router.patch("/{consumer_id}", response_model=ConsumerOut)
async def update_consumer(
    consumer_id: str,
    payload: ConsumerUpdate,
    _: Annotated[CurrentUser, Depends(require_master_write)],
):
    db = get_db()
    update = payload.model_dump(exclude_unset=True)
    if not update:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no fields to update")
    try:
        res = await db.consumers.find_one_and_update(
            {"_id": to_object_id(consumer_id)}, {"$set": update}, return_document=True
        )
    except DuplicateKeyError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, "duplicate consumer name") from e
    if res is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "consumer not found")
    return serialize(res)


@router.delete("/{consumer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_consumer(
    consumer_id: str, _: Annotated[CurrentUser, Depends(require_master_write)]
):
    db = get_db()
    res = await db.consumers.delete_one({"_id": to_object_id(consumer_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "consumer not found")
