from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated

from fastapi import Depends

from app.core.security import create_access_token, verify_password
from app.db.mongo import get_db
from app.models.schemas import TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]) -> TokenResponse:
    db = get_db()
    user = await db.users.find_one({"username": form.username, "active": True})
    if not user or not verify_password(form.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
    token = create_access_token(subject=user["username"], role=user["role"])
    return TokenResponse(
        access_token=token,
        role=user["role"],
        username=user["username"],
        full_name=user.get("full_name", user["username"]),
    )
