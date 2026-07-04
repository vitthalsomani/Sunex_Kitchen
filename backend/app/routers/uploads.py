"""File uploads (invoice photos). Stored under ./uploads, served at /uploads."""
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status

from app.core.deps import CurrentUser, require_purchase_write

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_file(
    request: Request,
    file: UploadFile,
    _: Annotated[CurrentUser, Depends(require_purchase_write)],
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"unsupported type {ext}")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "file too large (max 8 MB)")
    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    # absolute URL so the SPA (on a different origin/port) can load it
    base = str(request.base_url).rstrip("/")
    return {"url": f"{base}/uploads/{name}", "path": f"/uploads/{name}"}
