"""Reconstruct the perpetual stock ledger from staged legacy history.

Replays legacy_inward (as 'in') and legacy_outward (as 'out') into stock_ledger so
that current balance per item = Σ in − Σ out, reproducing the sheet's Master DB
`Balance = Σ Inward − Σ Outward`.

Item names are resolved via items + item_aliases; unknown names are auto-created as
items flagged {needs_review: True} so no history is dropped (curate/merge later via
the /item-aliases screen).

Idempotent: clears stock_ledger before replaying. Host-run:
  python backend/scripts/rebuild_stock.py --mongo mongodb://localhost:27019/?directConnection=true --db sspl_kitchen
"""
from __future__ import annotations

import argparse
import io
import sys

from pymongo import MongoClient

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mongo", default="mongodb://localhost:27019/?directConnection=true")
    ap.add_argument("--db", default="sspl_kitchen")
    args = ap.parse_args()

    db = MongoClient(args.mongo)[args.db]

    item_by_name = {d["name"].strip().lower(): d["_id"] for d in db.items.find({}, {"name": 1})}
    alias_map = {d["alias"].strip().lower(): d["item_id"] for d in db.item_aliases.find({}, {"alias": 1, "item_id": 1})}
    unit_by_name = {d["name"].strip().lower(): d["_id"] for d in db.units.find({}, {"name": 1})}

    default_cat = db.item_categories.find_one({"name": "Grocery"}) or db.item_categories.find_one({})
    default_cat_id = default_cat["_id"] if default_cat else None

    created: list[str] = []

    def resolve(name: str, unit: str | None):
        key = name.strip().lower()
        if key in item_by_name:
            return item_by_name[key]
        if key in alias_map:
            return alias_map[key]
        # auto-create a flagged item so history isn't lost
        doc = {
            "name": name.strip(),
            "category_id": default_cat_id,
            "unit_id": unit_by_name.get((unit or "").strip().lower()),
            "min_stock": None,
            "max_stock": None,
            "active": True,
            "needs_review": True,
        }
        _id = db.items.insert_one(doc).inserted_id
        item_by_name[key] = _id
        created.append(name.strip())
        return _id

    db.stock_ledger.delete_many({})
    movements = []

    for r in db.legacy_inward.find():
        qty = r.get("quantity")
        if not qty:
            continue
        movements.append(
            {
                "item_id": resolve(r["item_name"], r.get("unit")),
                "date": r.get("date"),
                "direction": "in",
                "quantity": float(qty),
                "source": "purchase",
                "ref_id": None,
                "note": "legacy inward",
            }
        )

    for r in db.legacy_outward.find():
        qty = r.get("quantity")
        if not qty:
            continue
        movements.append(
            {
                "item_id": resolve(r["item_name"], r.get("unit")),
                "date": r.get("date"),
                "direction": "out",
                "quantity": float(qty),
                "source": "outward",
                "ref_id": None,
                "note": "legacy outward",
            }
        )

    if movements:
        db.stock_ledger.insert_many(movements)

    # verify balances
    pipeline = [
        {
            "$group": {
                "_id": "$item_id",
                "bal": {
                    "$sum": {
                        "$cond": [{"$eq": ["$direction", "in"]}, "$quantity", {"$multiply": ["$quantity", -1]}]
                    }
                },
            }
        }
    ]
    balances = {row["_id"]: round(row["bal"], 3) for row in db.stock_ledger.aggregate(pipeline)}
    name_by_id = {d["_id"]: d["name"] for d in db.items.find({}, {"name": 1})}

    negatives = {name_by_id.get(k, k): v for k, v in balances.items() if v < 0}
    print(f"movements posted: {len(movements)}")
    print(f"items with stock movements: {len(balances)}")
    print(f"auto-created (needs_review) items: {len(created)}")
    print(f"items with NEGATIVE balance (legacy data issue): {len(negatives)}")
    for nm, v in sorted(negatives.items(), key=lambda x: x[1])[:15]:
        print(f"   {v:>10}  {nm}")

    print("\nTop 15 balances:")
    top = sorted(balances.items(), key=lambda x: x[1], reverse=True)[:15]
    for iid, v in top:
        print(f"   {v:>10}  {name_by_id.get(iid)}")

    print("\nDone.")


if __name__ == "__main__":
    main()
