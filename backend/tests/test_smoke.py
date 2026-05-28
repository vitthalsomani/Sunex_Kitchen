"""Pure-unit smoke tests — no Mongo/Redis required."""
from app.core.security import create_access_token, decode_token, hash_password, verify_password


def test_password_hash_roundtrip() -> None:
    h = hash_password("hunter2")
    assert verify_password("hunter2", h)
    assert not verify_password("wrong", h)


def test_jwt_roundtrip() -> None:
    tok = create_access_token("admin", "admin")
    payload = decode_token(tok)
    assert payload["sub"] == "admin"
    assert payload["role"] == "admin"
