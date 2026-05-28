"""Shared helpers for Mongo document <-> Pydantic conversion."""
from typing import Any

from bson import ObjectId


def oid_str(value: Any) -> str | None:
    """Convert ObjectId -> str (or pass through str)."""
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return str(value)
    return str(value)


def to_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ValueError(f"Invalid ObjectId: {value!r}")
    return ObjectId(value)


def serialize(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    """Convert a Mongo document to a JSON-safe dict: _id -> id, ObjectIds -> str."""
    if doc is None:
        return None
    out: dict[str, Any] = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = oid_str(v)
        elif isinstance(v, ObjectId):
            out[k] = oid_str(v)
        elif isinstance(v, list):
            out[k] = [oid_str(x) if isinstance(x, ObjectId) else x for x in v]
        else:
            out[k] = v
    return out
