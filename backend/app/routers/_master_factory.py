"""Shared CRUD + bulk-upload router for simple named masters."""
import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pymongo.errors import DuplicateKeyError

from app.core.deps import CurrentUser, require_admin, require_any
from app.db.mongo import get_db
from app.models.common import serialize, to_object_id
from app.models.schemas import (
    BulkUploadResult,
    NamedMasterCreate,
    NamedMasterOut,
    NamedMasterUpdate,
)


def build_named_master_router(collection: str, tag: str, prefix: str) -> APIRouter:
    router = APIRouter(prefix=f"/{prefix}", tags=[tag])

    @router.get("", response_model=list[NamedMasterOut])
    async def list_all(_: Annotated[CurrentUser, Depends(require_any)]):
        db = get_db()
        return [serialize(d) for d in await db[collection].find().sort("name", 1).to_list(None)]

    @router.post("", response_model=NamedMasterOut, status_code=status.HTTP_201_CREATED)
    async def create(
        payload: NamedMasterCreate, _: Annotated[CurrentUser, Depends(require_admin)]
    ):
        db = get_db()
        doc = payload.model_dump()
        try:
            r = await db[collection].insert_one(doc)
        except DuplicateKeyError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, f"{tag} with this name exists") from e
        doc["_id"] = r.inserted_id
        return serialize(doc)

    @router.patch("/{item_id}", response_model=NamedMasterOut)
    async def update(
        item_id: str,
        payload: NamedMasterUpdate,
        _: Annotated[CurrentUser, Depends(require_admin)],
    ):
        db = get_db()
        update_doc = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
        if not update_doc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "no fields to update")
        try:
            res = await db[collection].find_one_and_update(
                {"_id": to_object_id(item_id)}, {"$set": update_doc}, return_document=True
            )
        except DuplicateKeyError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "duplicate name") from e
        if res is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"{tag} not found")
        return serialize(res)

    @router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete(item_id: str, _: Annotated[CurrentUser, Depends(require_admin)]):
        db = get_db()
        res = await db[collection].delete_one({"_id": to_object_id(item_id)})
        if res.deleted_count == 0:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"{tag} not found")

    @router.post("/bulk-upload", response_model=BulkUploadResult)
    async def bulk_upload(
        file: UploadFile, _: Annotated[CurrentUser, Depends(require_admin)]
    ):
        if not file.filename or not file.filename.lower().endswith((".csv", ".txt")):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "expected CSV file")
        raw = await file.read()
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = raw.decode("latin-1")
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "empty CSV")
        # Accept either a "name" column, or just a single column
        fields = [f.strip().lower() for f in reader.fieldnames]
        name_field = None
        for candidate in ("name", "contractor name", "contractor_name"):
            if candidate in fields:
                name_field = reader.fieldnames[fields.index(candidate)]
                break
        if name_field is None and len(reader.fieldnames) == 1:
            name_field = reader.fieldnames[0]
        if name_field is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "CSV must have a 'name' column")

        db = get_db()
        inserted = 0
        skipped = 0
        errors: list[str] = []
        for row in reader:
            name = (row.get(name_field) or "").strip()
            if not name:
                skipped += 1
                continue
            doc = {"name": name, "code": (row.get("code") or "").strip() or None, "active": True}
            try:
                await db[collection].insert_one(doc)
                inserted += 1
            except DuplicateKeyError:
                skipped += 1
            except Exception as e:  # noqa: BLE001
                errors.append(f"{name}: {e}")
        return BulkUploadResult(inserted=inserted, skipped=skipped, errors=errors)

    return router
