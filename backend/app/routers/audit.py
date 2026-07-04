"""Audit log (admin-only): recent successful mutations captured by the middleware."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.deps import CurrentUser, require_admin
from app.db.mongo import get_db
from app.models.common import serialize

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
async def list_audit(
    _: Annotated[CurrentUser, Depends(require_admin)],
    limit: int = Query(200, ge=1, le=1000),
):
    db = get_db()
    rows = await db.audit_log.find().sort("ts", -1).limit(limit).to_list(limit)
    return [
        {
            "id": str(r["_id"]),
            "ts": r["ts"].isoformat() if r.get("ts") else None,
            "user": r.get("user"),
            "method": r.get("method"),
            "path": r.get("path"),
            "status": r.get("status"),
        }
        for r in rows
    ]
