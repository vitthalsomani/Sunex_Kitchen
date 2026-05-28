from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.init_db import init_db
from app.db.mongo import close_client
from app.db.redis import close_redis
from app.routers import (
    auth,
    company_groups,
    contractors,
    item_categories,
    items,
    meal_consumption,
    monthly_expenses,
    purchases,
    reports,
    stock,
    units,
    users,
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

API_PREFIX = "/api"
for router in (
    auth.router,
    users.router,
    contractors.router,
    company_groups.router,
    units.router,
    item_categories.router,
    items.router,
    meal_consumption.router,
    purchases.router,
    stock.router,
    monthly_expenses.router,
    reports.router,
):
    app.include_router(router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
