"""P4 Analytics: dashboard KPIs, cost-per-meal, contractor back-charge, charts, exports.

Costing honesty: food cost is the FIFO cost of stock ISSUED (outward). Legacy issues
carry no cost (legacy inward had no rates), so historical cost-per-meal is ~0 except
where opening cost layers were seeded — real numbers accrue as invoices→issues flow.
"""
import csv
import datetime as dt
import io
from datetime import date as Date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.core.deps import CurrentUser, require_any
from app.db.mongo import get_db
from app.models.common import oid_str
from app.models.schemas import (
    ContractorChargeRow,
    CostPerMealRow,
    DashboardOut,
    SeriesPoint,
)
from app.services import cost, stock

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ---------------- period helpers ----------------
def _month_bounds(y: int, m: int) -> tuple[dt.datetime, dt.datetime]:
    start = dt.datetime(y, m, 1)
    end = dt.datetime(y + (m == 12), (m % 12) + 1, 1)
    return start, end


def _iter_months(frm: str, to: str):
    y, m = int(frm[:4]), int(frm[5:7])
    ty, tm = int(to[:4]), int(to[5:7])
    while (y, m) <= (ty, tm):
        yield f"{y:04d}-{m:02d}", *_month_bounds(y, m)
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


async def _meals_between(start: dt.datetime, end: dt.datetime) -> int:
    db = get_db()
    pipe = [
        {"$match": {"date": {"$gte": start, "$lt": end}}},
        {"$unwind": "$lines"},
        {"$group": {"_id": None, "m": {"$sum": "$lines.count"}}},
    ]
    rows = await db.consumption.aggregate(pipe).to_list(1)
    return int(rows[0]["m"]) if rows else 0


async def _food_cost_between(start: dt.datetime, end: dt.datetime) -> float:
    db = get_db()
    pipe = [
        {"$match": {"date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": None, "c": {"$sum": "$total_cost"}}},
    ]
    rows = await db.outward.aggregate(pipe).to_list(1)
    return round(rows[0]["c"], 2) if rows and rows[0]["c"] else 0.0


async def _purchases_between(start: dt.datetime, end: dt.datetime) -> tuple[float, int]:
    db = get_db()
    pipe = [
        {"$match": {"invoice_date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": None, "v": {"$sum": "$total"}, "n": {"$sum": 1}}},
    ]
    rows = await db.purchase_invoices.aggregate(pipe).to_list(1)
    if not rows:
        return 0.0, 0
    return round(rows[0]["v"], 2), int(rows[0]["n"])


# ---------------- dashboard ----------------
@router.get("/dashboard", response_model=DashboardOut)
async def dashboard(_: Annotated[CurrentUser, Depends(require_any)]):
    db = get_db()
    today = dt.date.today()
    m_start, m_end = _month_bounds(today.year, today.month)
    day_start = dt.datetime(today.year, today.month, today.day)
    day_end = day_start + dt.timedelta(days=1)

    # stock value + low-stock
    vmap = await cost.valuation_all()
    stock_value = round(sum(v["value"] for v in vmap.values()), 2)
    bmap = await stock.balances_map()
    items = await db.items.find({"active": True}).sort("name", 1).to_list(None)
    cats = {oid_str(d["_id"]): d["name"] for d in await db.item_categories.find().to_list(None)}
    units = {oid_str(d["_id"]): d["name"] for d in await db.units.find().to_list(None)}
    low_stock = []
    for it in items:
        iid = oid_str(it["_id"])
        bal = bmap.get(iid, 0.0)
        mn = it.get("min_stock")
        if mn is not None and bal <= mn:
            low_stock.append(
                {
                    "item_id": iid, "item_name": it["name"],
                    "category_name": cats.get(oid_str(it.get("category_id"))),
                    "unit_name": units.get(oid_str(it.get("unit_id"))),
                    "balance": bal, "min_stock": mn, "max_stock": it.get("max_stock"), "low": True,
                }
            )

    meals_mtd = await _meals_between(m_start, m_end)
    meals_today = await _meals_between(day_start, day_end)
    purch_val, inv_n = await _purchases_between(m_start, m_end)
    food_cost = await _food_cost_between(m_start, m_end)

    kpis = {
        "stock_value": stock_value,
        "items_below_min": len(low_stock),
        "meals_mtd": meals_mtd,
        "meals_today": meals_today,
        "purchases_mtd_value": purch_val,
        "food_cost_mtd": food_cost,
        "cost_per_meal_mtd": round(food_cost / meals_mtd, 2) if meals_mtd else 0.0,
        "invoices_mtd": inv_n,
    }

    # recent activity: latest invoices + outward
    recent = []
    for inv in await db.purchase_invoices.find().sort("invoice_date", -1).limit(5).to_list(5):
        recent.append({"kind": "invoice", "date": inv["invoice_date"].date(),
                       "detail": f"Invoice {inv.get('invoice_number') or ''}".strip(),
                       "amount": inv.get("total")})
    for o in await db.outward.find().sort("date", -1).limit(5).to_list(5):
        recent.append({"kind": "outward", "date": o["date"].date(),
                       "detail": f"Issue ({len(o.get('lines', []))} items)",
                       "amount": o.get("total_cost")})
    recent.sort(key=lambda r: r["date"], reverse=True)

    return {"kpis": kpis, "low_stock": low_stock[:15], "recent": recent[:8]}


# ---------------- cost per meal ----------------
@router.get("/cost-per-meal", response_model=list[CostPerMealRow])
async def cost_per_meal(
    _: Annotated[CurrentUser, Depends(require_any)],
    frm: str = Query(..., alias="from", pattern=r"^\d{4}-\d{2}$"),
    to: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
):
    rows = []
    for month, start, end in _iter_months(frm, to):
        meals = await _meals_between(start, end)
        food_cost = await _food_cost_between(start, end)
        purch, _n = await _purchases_between(start, end)
        rows.append(
            {
                "month": month, "meals": meals, "food_cost": food_cost,
                "cost_per_meal": round(food_cost / meals, 2) if meals else 0.0,
                "purchases_value": purch,
            }
        )
    return rows


# ---------------- contractor back-charge (D2) ----------------
@router.get("/contractor-charges", response_model=list[ContractorChargeRow])
async def contractor_charges(
    _: Annotated[CurrentUser, Depends(require_any)],
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
):
    db = get_db()
    start, end = _month_bounds(int(month[:4]), int(month[5:7]))
    billable = {
        d["_id"]: d for d in await db.consumers.find({"billable": True, "meal_rate": {"$gt": 0}}).to_list(None)
    }
    if not billable:
        return []
    pipe = [
        {"$match": {"date": {"$gte": start, "$lt": end}}},
        {"$unwind": "$lines"},
        {"$match": {"lines.consumer_id": {"$in": list(billable)}}},
        {"$group": {"_id": "$lines.consumer_id", "meals": {"$sum": "$lines.count"}}},
    ]
    out = []
    async for r in db.consumption.aggregate(pipe):
        c = billable[r["_id"]]
        rate = c["meal_rate"]
        out.append(
            {
                "consumer_id": oid_str(r["_id"]), "consumer_name": c["name"],
                "meals": int(r["meals"]), "meal_rate": rate,
                "amount": round(r["meals"] * rate, 2),
            }
        )
    out.sort(key=lambda x: x["amount"], reverse=True)
    return out


# ---------------- charts ----------------
@router.get("/consumption-trend", response_model=list[SeriesPoint])
async def consumption_trend(
    _: Annotated[CurrentUser, Depends(require_any)], days: int = Query(30, ge=1, le=180)
):
    db = get_db()
    latest = await db.consumption.find_one(sort=[("date", -1)])
    if not latest:
        return []
    end = latest["date"] + dt.timedelta(days=1)
    start = end - dt.timedelta(days=days)
    pipe = [
        {"$match": {"date": {"$gte": start, "$lt": end}}},
        {"$unwind": "$lines"},
        {"$group": {"_id": "$date", "m": {"$sum": "$lines.count"}}},
        {"$sort": {"_id": 1}},
    ]
    return [
        {"label": r["_id"].date().isoformat(), "value": r["m"]}
        async for r in db.consumption.aggregate(pipe)
    ]


@router.get("/top-consumed", response_model=list[SeriesPoint])
async def top_consumed(
    _: Annotated[CurrentUser, Depends(require_any)],
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    limit: int = Query(10, ge=1, le=50),
):
    db = get_db()
    match: dict = {"direction": "out"}
    if month:
        start, end = _month_bounds(int(month[:4]), int(month[5:7]))
        match["date"] = {"$gte": start, "$lt": end}
    pipe = [
        {"$match": match},
        {"$group": {"_id": "$item_id", "q": {"$sum": "$quantity"}}},
        {"$sort": {"q": -1}},
        {"$limit": limit},
    ]
    rows = await db.stock_ledger.aggregate(pipe).to_list(limit)
    names = {
        d["_id"]: d["name"]
        for d in await db.items.find({"_id": {"$in": [r["_id"] for r in rows]}}).to_list(None)
    }
    return [{"label": names.get(r["_id"], "?"), "value": round(r["q"], 3)} for r in rows]


@router.get("/purchase-by-category", response_model=list[SeriesPoint])
async def purchase_by_category(
    _: Annotated[CurrentUser, Depends(require_any)],
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
):
    db = get_db()
    match: dict = {}
    if month:
        start, end = _month_bounds(int(month[:4]), int(month[5:7]))
        match["invoice_date"] = {"$gte": start, "$lt": end}
    invoices = await db.purchase_invoices.find(match).to_list(None)
    item_cat = {d["_id"]: d.get("category_id") for d in await db.items.find({}, {"category_id": 1}).to_list(None)}
    cat_name = {d["_id"]: d["name"] for d in await db.item_categories.find().to_list(None)}
    totals: dict = {}
    for inv in invoices:
        for ln in inv.get("lines", []):
            cat = item_cat.get(ln["item_id"])
            key = cat_name.get(cat, "Uncategorized")
            totals[key] = totals.get(key, 0.0) + ln.get("amount", 0.0)
    return [{"label": k, "value": round(v, 2)} for k, v in sorted(totals.items(), key=lambda x: -x[1])]


# ---------------- CSV exports ----------------
def _csv_response(rows: list[dict], headers: list[str], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=headers, extrasaction="ignore")
    w.writeheader()
    w.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/cost-per-meal.csv")
async def export_cost_per_meal(
    _: Annotated[CurrentUser, Depends(require_any)],
    frm: str = Query(..., alias="from", pattern=r"^\d{4}-\d{2}$"),
    to: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
):
    rows = []
    for month, start, end in _iter_months(frm, to):
        meals = await _meals_between(start, end)
        food = await _food_cost_between(start, end)
        purch, _n = await _purchases_between(start, end)
        rows.append({
            "month": month, "meals": meals, "food_cost": food,
            "cost_per_meal": round(food / meals, 2) if meals else 0.0, "purchases": purch,
        })
    return _csv_response(rows, ["month", "meals", "food_cost", "cost_per_meal", "purchases"], "cost-per-meal.csv")


@router.get("/export/contractor-charges.csv")
async def export_contractor_charges(
    _: Annotated[CurrentUser, Depends(require_any)],
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
):
    rows = await contractor_charges(_, month)  # reuse computation
    return _csv_response(
        [dict(r) for r in rows],
        ["consumer_name", "meals", "meal_rate", "amount"],
        f"contractor-charges-{month}.csv",
    )


@router.get("/export/valuation.csv")
async def export_valuation(_: Annotated[CurrentUser, Depends(require_any)]):
    db = get_db()
    items = await db.items.find({"active": True}).sort("name", 1).to_list(None)
    bmap = await stock.balances_map()
    vmap = await cost.valuation_all()
    rows = []
    for it in items:
        iid = oid_str(it["_id"])
        v = vmap.get(iid, {"costed_qty": 0.0, "value": 0.0})
        rows.append(
            {
                "item": it["name"], "balance": bmap.get(iid, 0.0),
                "costed_qty": v["costed_qty"], "value": v["value"],
                "avg_cost": round(v["value"] / v["costed_qty"], 2) if v["costed_qty"] else 0.0,
            }
        )
    return _csv_response(rows, ["item", "balance", "costed_qty", "value", "avg_cost"], "valuation.csv")
