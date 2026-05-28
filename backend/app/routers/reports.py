from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.deps import CurrentUser, require_any
from app.db.mongo import get_db
from app.models.common import oid_str, to_object_id
from app.models.schemas import CategoryExpense, MonthlyReportRow

router = APIRouter(prefix="/reports", tags=["reports"])


def _month_bounds(month: str) -> tuple[datetime, datetime]:
    year, mon = (int(x) for x in month.split("-"))
    start = datetime(year, mon, 1)
    end = datetime(year + (mon // 12), (mon % 12) + 1, 1)
    return start, end


def _classify(category_name: str) -> str:
    cl = category_name.strip().lower()
    if any(k in cl for k in ("gas", "coal")):
        return "gas_coal"
    if "oil" in cl:
        return "oil"
    if any(k in cl for k in ("groc", "veg")):
        return "grocery_veg"
    return "other"


async def _build_month(month: str) -> MonthlyReportRow:
    db = get_db()
    start, end = _month_bounds(month)

    # Total meals = sum of contractor+company counts across all shifts in month
    meals_cursor = db.meal_consumption.aggregate(
        [
            {"$match": {"date": {"$gte": start, "$lt": end}}},
            {
                "$project": {
                    "shift_total": {
                        "$add": [
                            {
                                "$sum": {
                                    "$map": {
                                        "input": "$contractor_counts",
                                        "as": "e",
                                        "in": "$$e.count",
                                    }
                                }
                            },
                            {
                                "$sum": {
                                    "$map": {
                                        "input": "$company_counts",
                                        "as": "e",
                                        "in": "$$e.count",
                                    }
                                }
                            },
                        ]
                    }
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$shift_total"}}},
        ]
    )
    meals_doc = await meals_cursor.to_list(1)
    total_meals = int(meals_doc[0]["total"]) if meals_doc else 0

    # Consumption value per category = sum over items of (opening_value + purchases_value - closing_value)
    stock_rows = await db.monthly_stock.find({"month": month}).to_list(None)
    item_ids = [r["item_id"] for r in stock_rows]
    items = {
        r["_id"]: r
        for r in await db.items.find({"_id": {"$in": item_ids}}).to_list(None)
    }
    cat_ids = {it["category_id"] for it in items.values()}
    cats = {r["_id"]: r["name"] for r in await db.item_categories.find({"_id": {"$in": list(cat_ids)}}).to_list(None)}

    purchase_value_by_item: dict = {}
    async for row in db.purchases.aggregate(
        [
            {"$match": {"date": {"$gte": start, "$lt": end}}},
            {"$group": {"_id": "$item_id", "value": {"$sum": "$amount"}}},
        ]
    ):
        purchase_value_by_item[row["_id"]] = row["value"]

    cat_totals: dict[str, float] = {}
    for s in stock_rows:
        item = items.get(s["item_id"])
        if not item:
            continue
        consumption = (
            (s.get("opening_value", 0) or 0)
            + purchase_value_by_item.get(s["item_id"], 0)
            - (s.get("closing_value", 0) or 0)
        )
        cat_name = cats.get(item["category_id"], "Unknown")
        cat_totals[cat_name] = cat_totals.get(cat_name, 0) + consumption

    category_expenses = [
        CategoryExpense(
            category_id=oid_str(
                next(c for c, n in cats.items() if n == cat_name)
            ) or "",
            category_name=cat_name,
            value=round(value, 2),
        )
        for cat_name, value in cat_totals.items()
    ]

    buckets = {"grocery_veg": 0.0, "gas_coal": 0.0, "oil": 0.0, "other": 0.0}
    for ce in category_expenses:
        buckets[_classify(ce.category_name)] += ce.value

    expense = await db.monthly_expenses.find_one({"month": month}) or {}
    manpower = float(expense.get("manpower_salary", 0))
    contractor = float(expense.get("contractor_payment", 0))

    total_expense = (
        buckets["grocery_veg"]
        + buckets["gas_coal"]
        + buckets["oil"]
        + buckets["other"]
        + manpower
        + contractor
    )
    cpm = round(total_expense / total_meals, 2) if total_meals else 0.0

    return MonthlyReportRow(
        month=month,
        total_meals=total_meals,
        category_expenses=category_expenses,
        grocery_veg_expense=round(buckets["grocery_veg"], 2),
        gas_coal_expense=round(buckets["gas_coal"], 2),
        oil_expense=round(buckets["oil"], 2),
        other_category_expense=round(buckets["other"], 2),
        manpower_salary=round(manpower, 2),
        contractor_payment=round(contractor, 2),
        total_expense=round(total_expense, 2),
        cost_per_meal=cpm,
    )


@router.get("/monthly-cost", response_model=MonthlyReportRow)
async def monthly_cost(
    month: Annotated[str, Query(pattern=r"^\d{4}-\d{2}$")],
    _: Annotated[CurrentUser, Depends(require_any)],
):
    return await _build_month(month)


@router.get("/cost-analysis", response_model=list[MonthlyReportRow])
async def cost_analysis(
    from_month: Annotated[str, Query(pattern=r"^\d{4}-\d{2}$", alias="from")],
    to_month: Annotated[str, Query(pattern=r"^\d{4}-\d{2}$", alias="to")],
    _: Annotated[CurrentUser, Depends(require_any)],
):
    """Return a row per month between [from, to] inclusive."""
    fy, fm = (int(x) for x in from_month.split("-"))
    ty, tm = (int(x) for x in to_month.split("-"))
    months: list[str] = []
    y, m = fy, fm
    while (y, m) <= (ty, tm):
        months.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return [await _build_month(mo) for mo in months]
