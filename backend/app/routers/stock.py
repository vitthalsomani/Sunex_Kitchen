from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser, require_admin, require_any, require_entry
from app.db.mongo import get_db
from app.models.common import oid_str, serialize, to_object_id
from app.models.schemas import StockOut, StockUpsert

router = APIRouter(prefix="/stock", tags=["stock"])


def _month_bounds(month: str) -> tuple[datetime, datetime]:
    year, mon = (int(x) for x in month.split("-"))
    start = datetime(year, mon, 1)
    end = datetime(year + (mon // 12), (mon % 12) + 1, 1)
    return start, end


async def _aggregate_purchases(month: str) -> dict[str, dict[str, float]]:
    """{item_id_str: {'qty': float, 'value': float}} for the month."""
    db = get_db()
    start, end = _month_bounds(month)
    cursor = db.purchases.aggregate(
        [
            {"$match": {"date": {"$gte": start, "$lt": end}}},
            {
                "$group": {
                    "_id": "$item_id",
                    "qty": {"$sum": "$quantity"},
                    "value": {"$sum": "$amount"},
                }
            },
        ]
    )
    out: dict[str, dict[str, float]] = {}
    async for row in cursor:
        out[oid_str(row["_id"])] = {"qty": row["qty"], "value": row["value"]}
    return out


async def _enrich(docs: list[dict], month: str) -> list[dict]:
    db = get_db()
    item_ids = {to_object_id(d["item_id"]) for d in docs if d.get("item_id")}
    items = {
        oid_str(d["_id"]): d
        for d in await db.items.find({"_id": {"$in": list(item_ids)}}).to_list(None)
    }
    cat_ids = {i["category_id"] for i in items.values()}
    unit_ids = {i["unit_id"] for i in items.values()}
    cats = {
        oid_str(d["_id"]): d["name"]
        for d in await db.item_categories.find({"_id": {"$in": list(cat_ids)}}).to_list(None)
    }
    units = {
        oid_str(d["_id"]): d["name"]
        for d in await db.units.find({"_id": {"$in": list(unit_ids)}}).to_list(None)
    }
    purchases = await _aggregate_purchases(month)
    for d in docs:
        item = items.get(d.get("item_id"))
        if item:
            d["item_name"] = item.get("name")
            d["category_id"] = oid_str(item.get("category_id"))
            d["category_name"] = cats.get(d["category_id"])
            d["unit_name"] = units.get(oid_str(item.get("unit_id")))
        p = purchases.get(d.get("item_id"), {"qty": 0, "value": 0})
        d["purchase_qty"] = round(p["qty"], 3)
        d["purchase_value"] = round(p["value"], 2)
        d["consumption_qty"] = round(
            d.get("opening_qty", 0) + p["qty"] - d.get("closing_qty", 0), 3
        )
        d["consumption_value"] = round(
            d.get("opening_value", 0) + p["value"] - d.get("closing_value", 0), 2
        )
    return docs


@router.get("", response_model=list[StockOut])
async def list_stock(
    month: Annotated[str, Query(pattern=r"^\d{4}-\d{2}$")],
    _: Annotated[CurrentUser, Depends(require_any)],
):
    db = get_db()
    docs = [serialize(d) for d in await db.monthly_stock.find({"month": month}).to_list(None)]
    return await _enrich(docs, month)


@router.put("", response_model=StockOut)
async def upsert(payload: StockUpsert, _: Annotated[CurrentUser, Depends(require_entry)]):
    db = get_db()
    doc = {
        "month": payload.month,
        "item_id": to_object_id(payload.item_id),
        "opening_qty": payload.opening_qty,
        "opening_value": payload.opening_value,
        "closing_qty": payload.closing_qty,
        "closing_value": payload.closing_value,
    }
    res = await db.monthly_stock.find_one_and_update(
        {"month": payload.month, "item_id": doc["item_id"]},
        {"$set": doc},
        upsert=True,
        return_document=True,
    )
    return (await _enrich([serialize(res)], payload.month))[0]


@router.delete("/{stock_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(stock_id: str, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    res = await db.monthly_stock.delete_one({"_id": to_object_id(stock_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "stock entry not found")
