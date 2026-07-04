"""P3 Daily meal consumption: per (date, shift) headcount across consumers."""
from datetime import date as Date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser, require_admin, require_any, require_consumption_write
from app.db.mongo import get_db
from app.models.common import oid_str, serialize, to_object_id
from app.models.schemas import ConsumptionOut, ConsumptionUpsert

router = APIRouter(prefix="/consumption", tags=["consumption"])


def _dt(d: Date, end: bool = False):
    import datetime as _d

    return _d.datetime.combine(d, _d.time(23, 59, 59) if end else _d.time(0, 0, 0))


async def _to_out(doc: dict) -> dict:
    db = get_db()
    lines = doc.get("lines", [])
    ids = [ln["consumer_id"] for ln in lines]
    names = {
        d["_id"]: d["name"] for d in await db.consumers.find({"_id": {"$in": ids}}).to_list(None)
    }
    out = serialize(doc)
    out["lines"] = [
        {"consumer_id": oid_str(ln["consumer_id"]), "consumer_name": names.get(ln["consumer_id"]), "count": ln["count"]}
        for ln in lines
    ]
    out["total"] = sum(ln["count"] for ln in lines)
    if doc.get("canteen_id"):
        c = await db.canteens.find_one({"_id": doc["canteen_id"]})
        out["canteen_name"] = c["name"] if c else None
    return out


@router.get("", response_model=list[ConsumptionOut])
async def list_consumption(
    _: Annotated[CurrentUser, Depends(require_any)],
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    date_from: Date | None = Query(None, alias="from"),
    date_to: Date | None = Query(None, alias="to"),
):
    db = get_db()
    q: dict = {}
    if month:
        y, m = int(month[:4]), int(month[5:7])
        q["date"] = {"$gte": _dt(Date(y, m, 1)), "$lt": _dt(Date(y + (m == 12), (m % 12) + 1, 1))}
    elif date_from or date_to:
        dr: dict = {}
        if date_from:
            dr["$gte"] = _dt(date_from)
        if date_to:
            dr["$lte"] = _dt(date_to, end=True)
        q["date"] = dr
    rows = await db.consumption.find(q).sort([("date", -1), ("shift", 1)]).to_list(None)
    return [await _to_out(r) for r in rows]


@router.put("", response_model=ConsumptionOut)
async def upsert_consumption(
    payload: ConsumptionUpsert, _: Annotated[CurrentUser, Depends(require_consumption_write)]
):
    db = get_db()
    # validate consumers exist
    lines = []
    for ln in payload.lines:
        cid = to_object_id(ln.consumer_id)
        if await db.consumers.find_one({"_id": cid}) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"consumer {ln.consumer_id} not found")
        lines.append({"consumer_id": cid, "count": ln.count})
    doc = {
        "date": _dt(payload.date),
        "shift": payload.shift,
        "canteen_id": to_object_id(payload.canteen_id) if payload.canteen_id else None,
        "lines": lines,
        "notes": payload.notes,
    }
    await db.consumption.update_one(
        {"date": doc["date"], "shift": doc["shift"]}, {"$set": doc}, upsert=True
    )
    saved = await db.consumption.find_one({"date": doc["date"], "shift": doc["shift"]})
    return await _to_out(saved)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_consumption(record_id: str, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    res = await db.consumption.delete_one({"_id": to_object_id(record_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "consumption record not found")
