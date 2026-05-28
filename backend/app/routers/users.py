from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.deps import CurrentUser, get_current_user, require_admin
from app.core.security import hash_password
from app.db.mongo import get_db
from app.models.common import serialize, to_object_id
from app.models.schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def me(user: Annotated[CurrentUser, Depends(get_current_user)]):
    db = get_db()
    rec = await db.users.find_one({"username": user.username})
    if not rec:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
    return serialize(rec)


@router.get("", response_model=list[UserOut])
async def list_users(_: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    return [serialize(d) for d in await db.users.find().to_list(length=None)]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    doc = {
        "username": payload.username,
        "full_name": payload.full_name,
        "role": payload.role,
        "email": payload.email,
        "active": payload.active,
        "password_hash": hash_password(payload.password),
    }
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, "username already exists") from e
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str, payload: UserUpdate, _: Annotated[CurrentUser, Depends(require_admin)]
):
    db = get_db()
    update: dict = {}
    for k, v in payload.model_dump(exclude_unset=True).items():
        if k == "password" and v:
            update["password_hash"] = hash_password(v)
        elif v is not None or k in ("email", "active"):
            update[k] = v
    if not update:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no fields to update")
    res = await db.users.find_one_and_update(
        {"_id": to_object_id(user_id)}, {"$set": update}, return_document=True
    )
    if res is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
    return serialize(res)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    res = await db.users.delete_one({"_id": to_object_id(user_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
