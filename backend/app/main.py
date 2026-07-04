from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.init_db import init_db
from app.db.mongo import close_client
from app.db.redis import close_redis
from app.routers import (
    analytics,
    audit,
    auth,
    canteens,
    uploads,
    company_groups,
    consumers,
    consumption,
    contractors,
    item_aliases,
    item_categories,
    items,
    meal_consumption,
    monthly_expenses,
    purchase_invoices,
    purchases,
    reports,
    staff,
    stock,
    store,
    units,
    users,
    vendors,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield
    await close_client()
    await close_redis()


app = FastAPI(title="SSPL Kitchen API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def audit_middleware(request, call_next):
    """Lightweight audit trail: record successful mutations with the acting user."""
    response = await call_next(request)
    from datetime import datetime, timezone

    from app.core.security import decode_token
    from app.db.mongo import get_db

    path = request.url.path
    if (
        request.method in ("POST", "PUT", "PATCH", "DELETE")
        and path.startswith("/api")
        and not path.endswith("/auth/login")
        and response.status_code < 400
    ):
        user = None
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            try:
                user = decode_token(auth[7:]).get("sub")
            except Exception:  # noqa: BLE001
                pass
        try:
            await get_db().audit_log.insert_one(
                {
                    "ts": datetime.now(timezone.utc),
                    "user": user,
                    "method": request.method,
                    "path": path,
                    "status": response.status_code,
                }
            )
        except Exception:  # noqa: BLE001 - never let auditing break a request
            pass
    return response

API_PREFIX = "/api"
for router in (
    auth.router,
    users.router,
    contractors.router,
    company_groups.router,
    units.router,
    item_categories.router,
    items.router,
    vendors.router,
    canteens.router,
    consumers.router,
    staff.router,
    item_aliases.router,
    store.router,
    purchase_invoices.router,
    consumption.router,
    analytics.router,
    audit.router,
    uploads.router,
    meal_consumption.router,
    purchases.router,
    stock.router,
    monthly_expenses.router,
    reports.router,
):
    app.include_router(router, prefix=API_PREFIX)

# Serve uploaded invoice photos (created lazily by the uploads router).
Path("uploads").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
