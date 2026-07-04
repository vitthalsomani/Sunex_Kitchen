"""Fold staged legacy_consumption rows into consumption docs (one per date+shift).

legacy_consumption is one row per (date, shift, consumer_name, count). We group these
into `consumption` documents with per-consumer lines, resolving consumer names to ids.

Idempotent: clears consumption first. Host-run:
  python backend/scripts/import_consumption.py
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

    # drop the stale (date,canteen_id,shift) unique index if it exists
    for name in list(db.consumption.index_information()):
        if name not in ("_id_", "date_1_shift_1"):
            db.consumption.drop_index(name)

    consumer_by_name = {d["name"].strip().lower(): d["_id"] for d in db.consumers.find({}, {"name": 1})}

    grouped: dict = {}  # (date, shift) -> {consumer_id: count}
    unknown: set = set()
    for r in db.legacy_consumption.find():
        cid = consumer_by_name.get((r.get("consumer_name") or "").strip().lower())
        if cid is None:
            unknown.add(r.get("consumer_name"))
            continue
        key = (r["date"], r["shift"])
        grouped.setdefault(key, {})[cid] = grouped.setdefault(key, {}).get(cid, 0) + int(r["count"])

    db.consumption.delete_many({})
    docs = []
    for (date, shift), counts in grouped.items():
        docs.append(
            {
                "date": date,
                "shift": shift,
                "canteen_id": None,
                "lines": [{"consumer_id": cid, "count": c} for cid, c in counts.items()],
                "notes": None,
            }
        )
    if docs:
        db.consumption.insert_many(docs)

    total_meals = sum(sum(ln["count"] for ln in d["lines"]) for d in docs)
    print(f"consumption docs (date x shift): {len(docs)}")
    print(f"total meals across all history: {total_meals:,}")
    if unknown:
        print(f"unknown consumer names skipped: {sorted(n for n in unknown if n)}")

    # sample: most recent day
    sample = db.consumption.find_one(sort=[("date", -1)])
    if sample:
        name_by_id = {d["_id"]: d["name"] for d in db.consumers.find({}, {"name": 1})}
        top = sorted(sample["lines"], key=lambda x: x["count"], reverse=True)[:5]
        print(f"\nSample {sample['date'].date()} {sample['shift']} "
              f"(total {sum(l['count'] for l in sample['lines'])}):")
        for ln in top:
            print(f"   {ln['count']:>4}  {name_by_id.get(ln['consumer_id'])}")

    print("\nDone.")


if __name__ == "__main__":
    main()
