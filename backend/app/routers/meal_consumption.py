from datetime import date, datetime, time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser, require_admin, require_any, require_entry
from app.db.mongo import get_db
from app.models.common import oid_str, serialize, to_object_id
from app.models.schemas import MealConsumptionOut, MealConsumptionUpsert

router = APIRouter(prefix="/meal-consumption", tags=["meal_consumption"])


def _to_dt(d: date) -> datetime:
    return datetime.combine(d, time.min)


def _format(doc: dict) -> dict:
    out = serialize(doc) or {}
    # Convert datetime back to date string for response
    if isinstance(out.get("date"), datetime):
        out["date"] = out["date"].date()
    # Convert ref_id ObjectIds in arrays to strings
    for key in ("contractor_counts", "company_counts"):
        for e in out.get(key, []):
            if "ref_id" in e:
                e["ref_id"] = oid_str(e["ref_id"]) or e["ref_id"]
    out["total"] = sum(e.get("count", 0) for e in out.get("contractor_counts", [])) + sum(
        e.get("count", 0) for e in out.get("company_counts", [])
    )
    return out


@router.get("", response_model=list[MealConsumptionOut])
async def list_records(
    _: Annotated[CurrentUser, Depends(require_any)],
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
):
    db = get_db()
    q: dict = {}
    if month:
        year, mon = (int(x) for x in month.split("-"))
        start = datetime(year, mon, 1)
        end = datetime(year + (mon // 12), (mon % 12) + 1, 1)
        q["date"] = {"$gte": start, "$lt": end}
    else:
        rng: dict = {}
        if from_date:
            rng["$gte"] = _to_dt(from_date)
        if to_date:
            rng["$lte"] = _to_dt(to_date)
        if rng:
            q["date"] = rng
    docs = await db.meal_consumption.find(q).sort([("date", -1), ("shift", 1)]).to_list(None)
    return [_format(d) for d in docs]


@router.put("", response_model=MealConsumptionOut)
async def upsert(payload: MealConsumptionUpsert, _: Annotated[CurrentUser, Depends(require_entry)]):
    db = get_db()
    doc = {
        "date": _to_dt(payload.date),
        "shift": payload.shift,
        "contractor_counts": [
            {"ref_id": to_object_id(e.ref_id), "count": e.count}
            for e in payload.contractor_counts
        ],
        "company_counts": [
            {"ref_id": to_object_id(e.ref_id), "count": e.count} for e in payload.company_counts
        ],
        "notes": payload.notes,
    }
    res = await db.meal_consumption.find_one_and_update(
        {"date": doc["date"], "shift": doc["shift"]},
        {"$set": doc},
        upsert=True,
        return_document=True,
    )
    return _format(res)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(record_id: str, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    res = await db.meal_consumption.delete_one({"_id": to_object_id(record_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "record not found")
