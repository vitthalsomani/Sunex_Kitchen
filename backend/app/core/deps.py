from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# 6-role RBAC (architecture §17)
ROLES = (
    "admin",
    "store_manager",
    "purchase",
    "canteen_incharge",
    "data_entry",
    "viewer",
)


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
require_any = require_roles(*ROLES)  # any authenticated user may read

# Write guards per the §17 permission matrix. `data_entry` may create in every
# transactional area; specialist roles write their own area; deletes are admin-only.
require_master_write = require_roles("admin", "store_manager")
require_store_write = require_roles("admin", "store_manager", "data_entry")
require_purchase_write = require_roles("admin", "purchase", "data_entry")
require_consumption_write = require_roles("admin", "canteen_incharge", "data_entry")

# Backwards-compatible alias used by existing routers (generic data-entry write).
require_entry = require_roles("admin", "data_entry", "store_manager", "canteen_incharge", "purchase")
