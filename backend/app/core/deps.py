from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ROLES = ("admin", "data_entry", "viewer")


class CurrentUser:
    def __init__(self, username: str, role: str) -> None:
        self.username = username
        self.role = role


def get_current_user(token: Annotated[str, Depends(oauth2)]) -> CurrentUser:
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token") from e
    username = payload.get("sub")
    role = payload.get("role")
    if not username or role not in ROLES:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token payload")
    return CurrentUser(username=username, role=role)


def require_roles(*allowed: str):
    def _checker(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "insufficient permissions")
        return user

    return _checker


require_admin = require_roles("admin")
require_entry = require_roles("admin", "data_entry")
require_any = require_roles("admin", "data_entry", "viewer")
