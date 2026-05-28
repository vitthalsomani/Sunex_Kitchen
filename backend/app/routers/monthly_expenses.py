from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import CurrentUser, require_admin, require_any, require_entry
from app.db.mongo import get_db
from app.models.common import serialize, to_object_id
from app.models.schemas import MonthlyExpenseOut, MonthlyExpenseUpsert

router = APIRouter(prefix="/monthly-expenses", tags=["monthly_expenses"])


@router.get("", response_model=list[MonthlyExpenseOut])
async def list_all(_: Annotated[CurrentUser, Depends(require_any)]):
    db = get_db()
    return [
        serialize(d) for d in await db.monthly_expenses.find().sort("month", -1).to_list(None)
    ]


@router.put("", response_model=MonthlyExpenseOut)
async def upsert(payload: MonthlyExpenseUpsert, _: Annotated[CurrentUser, Depends(require_entry)]):
    db = get_db()
    res = await db.monthly_expenses.find_one_and_update(
        {"month": payload.month},
        {"$set": payload.model_dump()},
        upsert=True,
        return_document=True,
    )
    return serialize(res)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(expense_id: str, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    res = await db.monthly_expenses.delete_one({"_id": to_object_id(expense_id)})
    if res.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "expense not found")
