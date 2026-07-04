"""FIFO cost-layer engine (D3).

Each receipt (purchase invoice line, or opening-cost seed) creates a `cost_layer`
with a rate and a remaining quantity. Issues consume the oldest layers first,
returning the consumed cost. Item value = Σ remaining_qty × rate over open layers.

Legacy stock that never had a purchase rate simply has no layer, so an issue may be
only partially "covered" — the uncovered quantity is treated as zero-cost rather than
blocking the issue (the ledger still prevents negative stock).
"""
from __future__ import annotations

import datetime as dt
from typing import Any

from bson import ObjectId

from app.db.mongo import get_db
from app.models.common import oid_str


def _as_datetime(d: Any) -> dt.datetime:
    if isinstance(d, dt.datetime):
        return d
    if isinstance(d, dt.date):
        return dt.datetime(d.year, d.month, d.day)
    return d


async def create_layer(
    *,
    item_id: ObjectId,
    in_date: Any,
    rate: float,
    qty: float,
    source_type: str,
    source_id: ObjectId | None = None,
) -> ObjectId:
    db = get_db()
    doc = {
        "item_id": item_id,
        "in_date": _as_datetime(in_date),
        "rate": float(rate),
        "original_qty": float(qty),
        "remaining_qty": float(qty),
        "source_type": source_type,
        "source_id": source_id,
    }
    res = await db.cost_layers.insert_one(doc)
    return res.inserted_id


async def consume_fifo(item_id: ObjectId, qty: float) -> dict:
    """Consume `qty` from oldest open layers. Returns {cost, covered_qty}."""
    db = get_db()
    remaining = float(qty)
    cost = 0.0
    covered = 0.0
    cursor = db.cost_layers.find(
        {"item_id": item_id, "remaining_qty": {"$gt": 0}}
    ).sort([("in_date", 1), ("_id", 1)])
    async for layer in cursor:
        if remaining <= 0:
            break
        take = min(layer["remaining_qty"], remaining)
        cost += take * layer["rate"]
        covered += take
        remaining -= take
        await db.cost_layers.update_one(
            {"_id": layer["_id"]}, {"$inc": {"remaining_qty": -take}}
        )
    return {"cost": round(cost, 2), "covered_qty": round(covered, 3)}


async def item_valuation(item_id: ObjectId) -> dict:
    db = get_db()
    pipeline = [
        {"$match": {"item_id": item_id, "remaining_qty": {"$gt": 0}}},
        {
            "$group": {
                "_id": None,
                "qty": {"$sum": "$remaining_qty"},
                "value": {"$sum": {"$multiply": ["$remaining_qty", "$rate"]}},
            }
        },
    ]
    rows = await db.cost_layers.aggregate(pipeline).to_list(1)
    if not rows:
        return {"costed_qty": 0.0, "value": 0.0, "avg_cost": 0.0}
    qty = round(rows[0]["qty"], 3)
    value = round(rows[0]["value"], 2)
    return {"costed_qty": qty, "value": value, "avg_cost": round(value / qty, 2) if qty else 0.0}


async def valuation_all() -> dict[str, dict]:
    db = get_db()
    pipeline = [
        {"$match": {"remaining_qty": {"$gt": 0}}},
        {
            "$group": {
                "_id": "$item_id",
                "qty": {"$sum": "$remaining_qty"},
                "value": {"$sum": {"$multiply": ["$remaining_qty", "$rate"]}},
            }
        },
    ]
    out: dict[str, dict] = {}
    async for row in db.cost_layers.aggregate(pipeline):
        qty = round(row["qty"], 3)
        value = round(row["value"], 2)
        out[oid_str(row["_id"])] = {"costed_qty": qty, "value": value}
    return out


async def layers_consumed(source_id: ObjectId) -> bool:
    """True if any layer from this source has been (partly) consumed."""
    db = get_db()
    doc = await db.cost_layers.find_one(
        {"source_id": source_id, "$expr": {"$lt": ["$remaining_qty", "$original_qty"]}}
    )
    return doc is not None


async def delete_layers(source_id: ObjectId) -> int:
    db = get_db()
    res = await db.cost_layers.delete_many({"source_id": source_id})
    return res.deleted_count


OPENING_DATE = dt.datetime(2020, 1, 1)


async def seed_opening_layers() -> dict:
    """(Re)build opening FIFO layers to value on-hand stock from recent purchase rates.

    Values current balance per item using the item's most recent legacy purchase rates,
    capped to on-hand qty (no phantom stock). Idempotent — clears source_type='opening'
    layers first. Run after alias curation so newly-mapped names contribute rates.
    """
    db = get_db()
    # name -> item_id via master + aliases
    item_by_name: dict[str, ObjectId] = {}
    async for d in db.items.find({}, {"name": 1}):
        item_by_name[d["name"].strip().lower()] = d["_id"]
    async for a in db.item_aliases.find({}, {"alias": 1, "item_id": 1}):
        item_by_name.setdefault(a["alias"].strip().lower(), a["item_id"])

    balances = await balances_from_ledger()

    rates_by_item: dict[ObjectId, list] = {}
    async for p in db.legacy_purchases.find({}, {"item_name": 1, "rate": 1, "quantity": 1, "invoice_date": 1}):
        iid = item_by_name.get((p.get("item_name") or "").strip().lower())
        if iid is None or iid not in balances or not p.get("rate") or not p.get("quantity"):
            continue
        rates_by_item.setdefault(iid, []).append(
            {"date": p.get("invoice_date") or OPENING_DATE, "rate": float(p["rate"]), "qty": float(p["quantity"])}
        )

    await db.cost_layers.delete_many({"source_type": "opening"})
    layers = []
    valued = 0
    for iid, bal in balances.items():
        rows = sorted(rates_by_item.get(iid, []), key=lambda r: r["date"], reverse=True)
        if not rows or bal <= 0:
            continue
        need = bal
        for r in rows:
            if need <= 0:
                break
            take = min(r["qty"], need)
            layers.append({
                "item_id": iid, "in_date": OPENING_DATE, "rate": r["rate"],
                "original_qty": take, "remaining_qty": take,
                "source_type": "opening", "source_id": None,
            })
            need -= take
        if need > 0:
            layers.append({
                "item_id": iid, "in_date": OPENING_DATE, "rate": rows[-1]["rate"],
                "original_qty": round(need, 3), "remaining_qty": round(need, 3),
                "source_type": "opening", "source_id": None,
            })
        valued += 1
    if layers:
        await db.cost_layers.insert_many(layers)
    total = round(sum(l["original_qty"] * l["rate"] for l in layers), 2)
    return {"items_valued": valued, "layers": len(layers), "total_value": total}


async def balances_from_ledger() -> dict[ObjectId, float]:
    """On-hand balance per item (ObjectId keys) = Σ in − Σ out."""
    db = get_db()
    pipe = [
        {
            "$group": {
                "_id": "$item_id",
                "bal": {"$sum": {"$cond": [{"$eq": ["$direction", "in"]}, "$quantity", {"$multiply": ["$quantity", -1]}]}},
            }
        },
        {"$match": {"bal": {"$gt": 0}}},
    ]
    out: dict[ObjectId, float] = {}
    async for r in db.stock_ledger.aggregate(pipe):
        out[r["_id"]] = round(r["bal"], 3)
    return out
