"""Seed opening FIFO cost layers so current on-hand stock has a valuation.

For each item that currently has stock (from the reconstructed ledger), we build FIFO
layers from the item's MOST RECENT legacy purchase rates, capped to the on-hand
balance — so we value existing stock without inventing extra quantity. Layers are
stamped with an early 'opening' date so they are consumed before any future purchase.

This is an approximate opening cost basis; forward invoices produce exact FIFO layers.

Idempotent: clears source_type='opening' layers first. Host-run:
  python backend/scripts/seed_cost_layers.py
"""
from __future__ import annotations

import argparse
import datetime as dt
import io
import sys

from pymongo import MongoClient

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
OPENING_DATE = dt.datetime(2020, 1, 1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mongo", default="mongodb://localhost:27019/?directConnection=true")
    ap.add_argument("--db", default="sspl_kitchen")
    args = ap.parse_args()
    db = MongoClient(args.mongo)[args.db]

    # resolve legacy purchase item-names -> item_id (master + aliases)
    item_by_name = {d["name"].strip().lower(): d["_id"] for d in db.items.find({}, {"name": 1})}
    for a in db.item_aliases.find({}, {"alias": 1, "item_id": 1}):
        item_by_name.setdefault(a["alias"].strip().lower(), a["item_id"])

    # current on-hand balance per item
    pipeline = [
        {
            "$group": {
                "_id": "$item_id",
                "bal": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$direction", "in"]},
                            "$quantity",
                            {"$multiply": ["$quantity", -1]},
                        ]
                    }
                },
            }
        },
        {"$match": {"bal": {"$gt": 0}}},
    ]
    balances = {row["_id"]: round(row["bal"], 3) for row in db.stock_ledger.aggregate(pipeline)}

    # gather purchase rates per item, most-recent first
    rates_by_item: dict = {}
    for p in db.legacy_purchases.find():
        iid = item_by_name.get((p.get("item_name") or "").strip().lower())
        if iid is None or iid not in balances:
            continue
        rate, qty = p.get("rate"), p.get("quantity")
        if not rate or not qty:
            continue
        rates_by_item.setdefault(iid, []).append(
            {"date": p.get("invoice_date") or OPENING_DATE, "rate": float(rate), "qty": float(qty)}
        )

    db.cost_layers.delete_many({"source_type": "opening"})
    layers = []
    valued, unvalued = 0, 0
    name_by_id = {d["_id"]: d["name"] for d in db.items.find({}, {"name": 1})}

    for iid, bal in balances.items():
        rows = sorted(rates_by_item.get(iid, []), key=lambda r: r["date"], reverse=True)
        if not rows:
            unvalued += 1
            continue
        need = bal
        for r in rows:
            if need <= 0:
                break
            take = min(r["qty"], need)
            layers.append(
                {
                    "item_id": iid,
                    "in_date": OPENING_DATE,
                    "rate": r["rate"],
                    "original_qty": take,
                    "remaining_qty": take,
                    "source_type": "opening",
                    "source_id": None,
                }
            )
            need -= take
        if need > 0:  # not enough purchase history -> extend at oldest known rate
            layers.append(
                {
                    "item_id": iid,
                    "in_date": OPENING_DATE,
                    "rate": rows[-1]["rate"],
                    "original_qty": round(need, 3),
                    "remaining_qty": round(need, 3),
                    "source_type": "opening",
                    "source_id": None,
                }
            )
        valued += 1

    if layers:
        db.cost_layers.insert_many(layers)

    total_value = sum(l["original_qty"] * l["rate"] for l in layers)
    print(f"items on hand: {len(balances)}")
    print(f"  valued (had purchase rates): {valued}")
    print(f"  unvalued (no matching purchase rate — needs alias curation): {unvalued}")
    print(f"opening layers created: {len(layers)}")
    print(f"TOTAL OPENING STOCK VALUE: Rs {total_value:,.2f}")

    print("\nTop 12 by value:")
    val_by_item: dict = {}
    for l in layers:
        val_by_item[l["item_id"]] = val_by_item.get(l["item_id"], 0) + l["original_qty"] * l["rate"]
    for iid, v in sorted(val_by_item.items(), key=lambda x: x[1], reverse=True)[:12]:
        print(f"   Rs {v:>12,.2f}  {name_by_id.get(iid)}")

    print("\nDone.")


if __name__ == "__main__":
    main()
