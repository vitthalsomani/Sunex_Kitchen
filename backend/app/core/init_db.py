from app.config import settings
from app.core.security import hash_password
from app.db.mongo import get_db


async def ensure_indexes() -> None:
    db = get_db()
    await db.users.create_index("username", unique=True)
    await db.contractors.create_index("name", unique=True)
    await db.company_groups.create_index("name", unique=True)
    await db.units.create_index("name", unique=True)
    await db.item_categories.create_index("name", unique=True)
    await db.items.create_index([("name", 1), ("category_id", 1)], unique=True)
    await db.meal_consumption.create_index([("date", 1), ("shift", 1)], unique=True)
    await db.purchases.create_index([("date", 1), ("item_id", 1)])
    await db.monthly_stock.create_index([("month", 1), ("item_id", 1)], unique=True)
    await db.monthly_expenses.create_index("month", unique=True)


async def ensure_admin() -> None:
    db = get_db()
    if await db.users.find_one({"username": settings.admin_username}) is None:
        await db.users.insert_one(
            {
                "username": settings.admin_username,
                "full_name": "Administrator",
                "role": "admin",
                "password_hash": hash_password(settings.admin_password),
                "active": True,
            }
        )


async def init_db() -> None:
    await ensure_indexes()
    await ensure_admin()
