"""Perpetual stock ledger engine.

The ledger (`stock_ledger`) is append-only: every receipt, issue, adjustment and
opening balance is a movement. Current balance is always recomputed from movements
(Σ in − Σ out), never mutated in place — matching the sheet's
`Balance = Σ Inward − Σ Outward` but with integrity and validation.
"""
from __future__ import annotations

import datetime as dt
from typing import Any

from bson import ObjectId

from app.db.mongo import get_db
from app.models.common import oid_str, to_object_id
from app.models.schemas import MovementSource


def _as_datetime(d: Any) -> dt.datetime:
    if isinstance(d, dt.datetime):
        return d
    if isinstance(d, dt.date):
        return dt.datetime(d.year, d.month, d.day)
    return d


async def resolve_item_id(name: str) -> ObjectId | None:
    """Resolve a free-text item name to a canonical item _id via master + aliases."""
    db = get_db()
    key = name.strip()
    doc = await db.items.find_one({"name": {"$regex": f"^{_escape(key)}$", "$options": "i"}})
    if doc:
        return doc["_id"]
    alias = await db.item_aliases.find_one({"alias": {"$regex": f"^{_escape(key)}$", "$options": "i"}})
    if alias:
        return alias["item_id"]
    return None


def _escape(s: str) -> str:
    import re

    return re.escape(s)


async def post_movement(
    *,
    item_id: ObjectId,
    date: Any,
    direction: str,  # "in" | "out"
    quantity: float,
    source: MovementSource,
    ref_id: ObjectId | None = None,
    note: str | None = None,
) -> ObjectId:
    """Append one movement to the ledger. Returns the movement _id."""
    db = get_db()
    doc = {
        "item_id": item_id,
        "date": _as_datetime(date),
        "direction": direction,
        "quantity": float(quantity),
        "source": source,
        "ref_id": ref_id,
        "note": note,
    }
    res = await db.stock_ledger.insert_one(doc)
    return res.inserted_id


async def current_balance(item_id: ObjectId) -> float:
    """Balance for a single item = Σ in − Σ out."""
    db = get_db()
    pipeline = [
        {"$match": {"item_id": item_id}},
        {
            "$group": {
                "_id": None,
                "in": {"$sum": {"$cond": [{"$eq": ["$direction", "in"]}, "$quantity", 0]}},
                "out": {"$sum": {"$cond": [{"$eq": ["$direction", "out"]}, "$quantity", 0]}},
            }
        },
    ]
    rows = await db.stock_ledger.aggregate(pipeline).to_list(1)
    if not rows:
        return 0.0
    return round(rows[0]["in"] - rows[0]["out"], 3)


async def balances_map() -> dict[str, float]:
    """Balance for every item that has movements: {item_id_str: balance}."""
    db = get_db()
    pipeline = [
        {
            "$group": {
                "_id": "$item_id",
                "in": {"$sum": {"$cond": [{"$eq": ["$direction", "in"]}, "$quantity", 0]}},
                "out": {"$sum": {"$cond": [{"$eq": ["$direction", "out"]}, "$quantity", 0]}},
            }
        },
    ]
    out: dict[str, float] = {}
    async for row in db.stock_ledger.aggregate(pipeline):
        out[oid_str(row["_id"])] = round(row["in"] - row["out"], 3)
    return out
