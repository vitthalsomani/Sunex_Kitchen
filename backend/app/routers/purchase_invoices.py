"""P2 Procurement: invoice purchases -> auto-GRN inward + FIFO cost layers (D1, D3)."""
from datetime import date as Date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser, require_admin, require_any, require_purchase_write
from app.db.mongo import get_db
from app.models.common import oid_str, serialize, to_object_id
from app.models.schemas import PurchaseInvoiceCreate, PurchaseInvoiceOut
from app.services import cost, stock

router = APIRouter(prefix="/purchase-invoices", tags=["purchase-invoices"])


def _dt(d: Date, end: bool = False):
    import datetime as _d

    return _d.datetime.combine(d, _d.time(23, 59, 59) if end else _d.time(0, 0, 0))


async def _to_out(doc: dict) -> dict:
    db = get_db()
    vendor = await db.vendors.find_one({"_id": doc["vendor_id"]}) if doc.get("vendor_id") else None
    item_ids = [ln["item_id"] for ln in doc.get("lines", [])]
    names = {
        d["_id"]: d["name"] for d in await db.items.find({"_id": {"$in": item_ids}}).to_list(None)
    }
    out = serialize(doc)
    out["vendor_name"] = vendor["name"] if vendor else None
    out["lines"] = [
        {
            "item_id": oid_str(ln["item_id"]),
            "item_name": names.get(ln["item_id"]),
            "quantity": ln["quantity"],
            "rate": ln["rate"],
            "amount": ln["amount"],
        }
        for ln in doc.get("lines", [])
    ]
    return out


@router.get("", response_model=list[PurchaseInvoiceOut])
async def list_invoices(
    _: Annotated[CurrentUser, Depends(require_any)],
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
):
    db = get_db()
    q: dict = {}
    if month:
        y, m = int(month[:4]), int(month[5:7])
        start = _dt(Date(y, m, 1))
        end = _dt(Date(y + (m == 12), (m % 12) + 1, 1))
        q["invoice_date"] = {"$gte": start, "$lt": end}
    rows = await db.purchase_invoices.find(q).sort("invoice_date", -1).to_list(None)
    return [await _to_out(r) for r in rows]


@router.get("/{invoice_id}", response_model=PurchaseInvoiceOut)
async def get_invoice(invoice_id: str, _: Annotated[CurrentUser, Depends(require_any)]):
    db = get_db()
    doc = await db.purchase_invoices.find_one({"_id": to_object_id(invoice_id)})
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "invoice not found")
    return await _to_out(doc)


@router.post("", response_model=PurchaseInvoiceOut, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: PurchaseInvoiceCreate, _: Annotated[CurrentUser, Depends(require_purchase_write)]
):
    db = get_db()
    vendor_oid = to_object_id(payload.vendor_id)
    if await db.vendors.find_one({"_id": vendor_oid}) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vendor not found")
    if payload.invoice_number:
        dup = await db.purchase_invoices.find_one(
            {"vendor_id": vendor_oid, "invoice_number": payload.invoice_number}
        )
        if dup:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "duplicate invoice number for this vendor"
            )

    # validate items + build lines
    lines = []
    total = 0.0
    for ln in payload.lines:
        oid = to_object_id(ln.item_id)
        if await db.items.find_one({"_id": oid}) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"item {ln.item_id} not found")
        amount = round(ln.quantity * ln.rate, 2)
        total += amount
        lines.append({"item_id": oid, "quantity": ln.quantity, "rate": ln.rate, "amount": amount})

    doc = {
        "vendor_id": vendor_oid,
        "invoice_date": _dt(payload.invoice_date),
        "invoice_number": payload.invoice_number,
        "invoice_photo": payload.invoice_photo,
        "lines": lines,
        "total": round(total, 2),
        "remarks": payload.remarks,
    }
    res = await db.purchase_invoices.insert_one(doc)
    doc["_id"] = res.inserted_id

    # D1: auto-GRN inward movement + D3: FIFO cost layer, per line
    for ln in lines:
        await stock.post_movement(
            item_id=ln["item_id"], date=payload.invoice_date, direction="in",
            quantity=ln["quantity"], source="purchase", ref_id=res.inserted_id,
            note=f"Invoice {payload.invoice_number or ''}".strip(),
        )
        await cost.create_layer(
            item_id=ln["item_id"], in_date=payload.invoice_date, rate=ln["rate"],
            qty=ln["quantity"], source_type="purchase", source_id=res.inserted_id,
        )
    return await _to_out(doc)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(invoice_id: str, _: Annotated[CurrentUser, Depends(require_admin)]):
    db = get_db()
    oid = to_object_id(invoice_id)
    if await db.purchase_invoices.find_one({"_id": oid}) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "invoice not found")
    # can't cleanly reverse once its FIFO stock has been issued
    if await cost.layers_consumed(oid):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "cannot delete: stock from this invoice has already been issued",
        )
    await db.stock_ledger.delete_many({"ref_id": oid, "source": "purchase"})
    await cost.delete_layers(oid)
    await db.purchase_invoices.delete_one({"_id": oid})
