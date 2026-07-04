"""P1 Store / Inventory: perpetual stock ledger, balances, inward, outward, adjustments."""
from datetime import date as Date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser, require_admin, require_any, require_store_write
from app.db.mongo import get_db
from app.models.common import oid_str, serialize, to_object_id
from app.models.schemas import (
    InwardCreate,
    OutwardCreate,
    OutwardOut,
    StockAdjustmentCreate,
    StockBalanceOut,
    StockMovementOut,
    ValuationOut,
)
from app.services import cost, stock

router = APIRouter(prefix="/store", tags=["store"])


# ---------------- balances & low-stock ----------------
async def _balances(only_low: bool) -> list[dict]:
    db = get_db()
    items = await db.items.find({"active": True}).sort("name", 1).to_list(None)
    bmap = await stock.balances_map()
    cats = {oid_str(d["_id"]): d["name"] for d in await db.item_categories.find().to_list(None)}
    units = {oid_str(d["_id"]): d["name"] for d in await db.units.find().to_list(None)}
    out: list[dict] = []
    for it in items:
        iid = oid_str(it["_id"])
        bal = bmap.get(iid, 0.0)
        min_stock = it.get("min_stock")
        low = min_stock is not None and bal <= min_stock
        if only_low and not low:
            continue
        out.append(
            {
                "item_id": iid,
                "item_name": it["name"],
                "category_name": cats.get(oid_str(it.get("category_id"))),
                "unit_name": units.get(oid_str(it.get("unit_id"))),
                "balance": bal,
                "min_stock": min_stock,
                "max_stock": it.get("max_stock"),
                "low": low,
            }
        )
    return out


@router.get("/balances", response_model=list[StockBalanceOut])
async def list_balances(_: Annotated[CurrentUser, Depends(require_any)]):
    return await _balances(only_low=False)


@router.get("/low-stock", response_model=list[StockBalanceOut])
async def list_low_stock(_: Annotated[CurrentUser, Depends(require_any)]):
    return await _balances(only_low=True)


# ---------------- valuation (FIFO) ----------------
@router.get("/valuation", response_model=list[ValuationOut])
async def valuation(_: Annotated[CurrentUser, Depends(require_any)]):
    db = get_db()
    items = await db.items.find({"active": True}).sort("name", 1).to_list(None)
    bmap = await stock.balances_map()
    vmap = await cost.valuation_all()
    cats = {oid_str(d["_id"]): d["name"] for d in await db.item_categories.find().to_list(None)}
    units = {oid_str(d["_id"]): d["name"] for d in await db.units.find().to_list(None)}
    out: list[dict] = []
    for it in items:
        iid = oid_str(it["_id"])
        val = vmap.get(iid, {"costed_qty": 0.0, "value": 0.0})
        costed = val["costed_qty"]
        out.append(
            {
                "item_id": iid,
                "item_name": it["name"],
                "category_name": cats.get(oid_str(it.get("category_id"))),
                "unit_name": units.get(oid_str(it.get("unit_id"))),
                "balance": bmap.get(iid, 0.0),
                "costed_qty": costed,
                "value": val["value"],
                "avg_cost": round(val["value"] / costed, 2) if costed else 0.0,
            }
        )
    return out


# ---------------- ledger ----------------
@router.get("/ledger", response_model=list[StockMovementOut])
async def ledger(
    _: Annotated[CurrentUser, Depends(require_any)],
    item_id: str = Query(...),
    date_from: Date | None = Query(None, alias="from"),
    date_to: Date | None = Query(None, alias="to"),
):
    db = get_db()
    oid = to_object_id(item_id)
    q: dict = {"item_id": oid}
    if date_from or date_to:
        drange: dict = {}
        if date_from:
            drange["$gte"] = _dt(date_from)
        if date_to:
            drange["$lte"] = _dt(date_to, end=True)
        q["date"] = drange
    item = await db.items.find_one({"_id": oid})
    item_name = item["name"] if item else None
    # running balance needs all movements up to each row -> fetch full history sorted
    all_moves = await db.stock_ledger.find({"item_id": oid}).sort([("date", 1), ("_id", 1)]).to_list(None)
    running = 0.0
    balance_by_id: dict = {}
    for m in all_moves:
        running += m["quantity"] if m["direction"] == "in" else -m["quantity"]
        balance_by_id[m["_id"]] = round(running, 3)
    rows = [m for m in all_moves if _in_range(m["date"], date_from, date_to)]
    result = []
    for m in rows:
        d = serialize(m)
        d["item_name"] = item_name
        d["balance_after"] = balance_by_id[m["_id"]]
        result.append(d)
    return result


# ---------------- inward (manual receipt) ----------------
@router.post("/inward", status_code=status.HTTP_201_CREATED)
async def create_inward(
    payload: InwardCreate, _: Annotated[CurrentUser, Depends(require_store_write)]
):
    db = get_db()
    oid = to_object_id(payload.item_id)
    if await db.items.find_one({"_id": oid}) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item not found")
    mid = await stock.post_movement(
        item_id=oid,
        date=payload.date,
        direction="in",
        quantity=payload.quantity,
        source="purchase" if payload.rate is not None else "adjustment",
        note=payload.note or (payload.received_by and f"Received by {payload.received_by}"),
    )
    # if a rate was supplied, this manual receipt also creates a FIFO cost layer
    if payload.rate is not None:
        await cost.create_layer(
            item_id=oid, in_date=payload.date, rate=payload.rate,
            qty=payload.quantity, source_type="inward", source_id=mid,
        )
    return {"id": oid_str(mid), "balance": await stock.current_balance(oid)}


# ---------------- outward / issue (stock-checked) ----------------
@router.post("/outward", response_model=OutwardOut, status_code=status.HTTP_201_CREATED)
async def create_outward(
    payload: OutwardCreate, _: Annotated[CurrentUser, Depends(require_store_write)]
):
    db = get_db()
    # validate items + negative-stock prevention BEFORE writing anything
    checked: list[tuple] = []
    for line in payload.lines:
        oid = to_object_id(line.item_id)
        item = await db.items.find_one({"_id": oid})
        if item is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"item {line.item_id} not found")
        bal = await stock.current_balance(oid)
        if line.quantity > bal:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"insufficient stock for '{item['name']}': have {bal}, need {line.quantity}",
            )
        checked.append((oid, line.quantity))

    canteen_oid = to_object_id(payload.canteen_id) if payload.canteen_id else None
    header = {
        "date": _dt(payload.date),
        "canteen_id": canteen_oid,
        "issued_by": payload.issued_by,
        "lines": [{"item_id": oid, "quantity": q} for oid, q in checked],
        "note": payload.note,
    }
    res = await db.outward.insert_one(header)
    total_cost = 0.0
    for oid, qty in checked:
        await stock.post_movement(
            item_id=oid, date=payload.date, direction="out", quantity=qty,
            source="outward", ref_id=res.inserted_id, note=payload.note,
        )
        # D3: consume FIFO cost layers for the issued qty
        consumed = await cost.consume_fifo(oid, qty)
        total_cost += consumed["cost"]
    total_cost = round(total_cost, 2)
    await db.outward.update_one({"_id": res.inserted_id}, {"$set": {"total_cost": total_cost}})
    header["_id"] = res.inserted_id
    doc = serialize(header)
    doc["lines"] = [{"item_id": oid_str(x["item_id"]), "quantity": x["quantity"]} for x in header["lines"]]
    doc["total_cost"] = total_cost
    if canteen_oid:
        c = await db.canteens.find_one({"_id": canteen_oid})
        doc["canteen_name"] = c["name"] if c else None
    return doc


@router.get("/outward", response_model=list[OutwardOut])
async def list_outward(
    _: Annotated[CurrentUser, Depends(require_any)],
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
):
    db = get_db()
    q: dict = {}
    if month:
        y, m = month.split("-")
        start = _dt(Date(int(y), int(m), 1))
        end_m = _dt(Date(int(y) + (m == "12"), (int(m) % 12) + 1, 1))
        q["date"] = {"$gte": start, "$lt": end_m}
    rows = await db.outward.find(q).sort([("date", -1)]).to_list(None)
    canteens = {oid_str(d["_id"]): d["name"] for d in await db.canteens.find().to_list(None)}
    result = []
    for r in rows:
        d = serialize(r)
        d["lines"] = [{"item_id": oid_str(x["item_id"]), "quantity": x["quantity"]} for x in r.get("lines", [])]
        d["canteen_name"] = canteens.get(oid_str(r.get("canteen_id"))) if r.get("canteen_id") else None
        result.append(d)
    return result


@router.delete("/outward/{outward_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_outward(outward_id: str, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    oid = to_object_id(outward_id)
    res = await db.outward.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "outward not found")
    await db.stock_ledger.delete_many({"ref_id": oid, "source": "outward"})


# ---------------- adjustment ----------------
@router.post("/adjustments", status_code=status.HTTP_201_CREATED)
async def create_adjustment(
    payload: StockAdjustmentCreate, _: Annotated[CurrentUser, Depends(require_store_write)]
):
    db = get_db()
    oid = to_object_id(payload.item_id)
    if await db.items.find_one({"_id": oid}) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item not found")
    if payload.qty_delta == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "qty_delta cannot be zero")
    if payload.qty_delta < 0 and abs(payload.qty_delta) > await stock.current_balance(oid):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "adjustment would make stock negative")
    direction = "in" if payload.qty_delta > 0 else "out"
    await stock.post_movement(
        item_id=oid, date=payload.date, direction=direction,
        quantity=abs(payload.qty_delta), source="adjustment", note=payload.reason,
    )
    return {"balance": await stock.current_balance(oid)}


# ---------------- helpers ----------------
def _dt(d: Date, end: bool = False):
    import datetime as _d

    t = _d.time(23, 59, 59) if end else _d.time(0, 0, 0)
    return _d.datetime.combine(d, t)


def _in_range(value, dfrom: Date | None, dto: Date | None) -> bool:
    if dfrom and value < _dt(dfrom):
        return False
    if dto and value > _dt(dto, end=True):
        return False
    return True
