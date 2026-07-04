"""Onboard the purchase-feed item names that aren't in the item master yet.

The purchase form logged ~200 names (fresh vegetables & milk in Hindi, branded
spices, pack-size variants) that were never tracked as store stock. This creates a
canonical item for each so they can be invoiced in the app. Items that fuzzy-match an
existing canonical item are flagged {needs_review: True} (likely spelling variants to
merge later on the Alias Curation screen); genuinely-new names are created clean.

Units and a few categories are created on demand. Idempotent (skips names that now
resolve to an item/alias). Host-run:
  python backend/scripts/onboard_purchase_items.py
"""
from __future__ import annotations

import argparse
import difflib
import io
import sys
from collections import Counter

from pymongo import MongoClient

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def classify_category(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ("gas", "coal", "lpg", "cylinder", "koyla")):
        return "Gas & Fuel"
    if any(k in n for k in ("oil", "ghee", "dalda", "tel")):
        return "Oil & Ghee"
    if any(k in n for k in ("milk", "doodh", "paneer", "dahi", "curd", "chaach", "chhachh", "butter", "cream")):
        return "Dairy"
    return "Grocery"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mongo", default="mongodb://localhost:27019/?directConnection=true")
    ap.add_argument("--db", default="sspl_kitchen")
    args = ap.parse_args()
    db = MongoClient(args.mongo)[args.db]

    known = {d["name"].strip().lower() for d in db.items.find({}, {"name": 1})}
    known |= {a["alias"].strip().lower() for a in db.item_aliases.find({}, {"alias": 1})}
    canon = [d["name"] for d in db.items.find({"needs_review": {"$ne": True}}, {"name": 1})]

    cat_ids = {d["name"]: d["_id"] for d in db.item_categories.find({}, {"name": 1})}
    unit_ids = {d["name"].strip().lower(): d["_id"] for d in db.units.find({}, {"name": 1})}

    def cat_id(name: str):
        c = classify_category(name)
        if c not in cat_ids:
            cat_ids[c] = db.item_categories.insert_one({"name": c, "active": True}).inserted_id
        return cat_ids[c]

    def unit_id(u: str | None):
        if not u:
            return None
        key = u.strip().lower()
        if key not in unit_ids:
            unit_ids[key] = db.units.insert_one({"name": u.strip(), "active": True}).inserted_id
        return unit_ids[key]

    # gather unmatched names + their most common purchase unit
    units_for: dict[str, Counter] = {}
    for p in db.legacy_purchases.find({}, {"item_name": 1, "unit": 1}):
        nm = (p.get("item_name") or "").strip()
        if nm and nm.lower() not in known:
            units_for.setdefault(nm, Counter())[(p.get("unit") or "").strip()] += 1

    created_clean = 0
    created_flagged = 0
    for nm, uc in units_for.items():
        if nm.lower() in known:  # created earlier in this loop via alias? (safety)
            continue
        common_unit = uc.most_common(1)[0][0] if uc else None
        is_variant = bool(difflib.get_close_matches(nm.lower(), [c.lower() for c in canon], n=1, cutoff=0.8))
        try:
            db.items.insert_one({
                "name": nm,
                "category_id": cat_id(nm),
                "unit_id": unit_id(common_unit),
                "min_stock": None,
                "max_stock": None,
                "active": True,
                "needs_review": is_variant,
            })
            known.add(nm.lower())
            if is_variant:
                created_flagged += 1
            else:
                created_clean += 1
        except Exception as e:  # noqa: BLE001
            print(f"  skip {nm}: {e}")

    print(f"onboarded {created_clean + created_flagged} items "
          f"({created_clean} clean new, {created_flagged} flagged as likely duplicates)")
    print(f"total items now: {db.items.count_documents({})}")
    print(f"categories: {sorted(cat_ids)}")
    print(f"units: {sorted(unit_ids)}")


if __name__ == "__main__":
    main()
