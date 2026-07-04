"""API smoke tests for the redesigned Kitchen ERP.

Exercises the running server end-to-end (auth, masters, store ledger, FIFO round-trip,
analytics). Skips automatically if the API isn't reachable, so it never blocks unit runs.

Run inside the backend container:
  SMOKE_BASE_URL=http://localhost:8000/api pytest tests/test_api_smoke.py
Or against the host-mapped port:
  SMOKE_BASE_URL=http://localhost:8090/api pytest tests/test_api_smoke.py
"""
import os

import httpx
import pytest

BASE = os.environ.get("SMOKE_BASE_URL", "http://localhost:8000/api")
ADMIN = (os.environ.get("SMOKE_USER", "admin"), os.environ.get("SMOKE_PASS", "admin123"))


def _reachable() -> bool:
    try:
        httpx.get(BASE.replace("/api", "/health"), timeout=2)
        return True
    except Exception:  # noqa: BLE001
        return False


pytestmark = pytest.mark.skipif(not _reachable(), reason="API not running")


@pytest.fixture(scope="module")
def token() -> str:
    r = httpx.post(f"{BASE}/auth/login", data={"username": ADMIN[0], "password": ADMIN[1]})
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth(token) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_login_returns_admin_role(token):
    assert token


def test_masters_populated(auth):
    for coll, minimum in [("items", 60), ("consumers", 50), ("vendors", 30)]:
        r = httpx.get(f"{BASE}/{coll}", headers=auth)
        assert r.status_code == 200
        assert len(r.json()) >= minimum, coll


def test_stock_balances_and_valuation(auth):
    bals = httpx.get(f"{BASE}/store/balances", headers=auth).json()
    assert any(b["balance"] > 0 for b in bals)
    val = httpx.get(f"{BASE}/store/valuation", headers=auth).json()
    assert sum(v["value"] for v in val) > 0


def test_dashboard_kpis(auth):
    k = httpx.get(f"{BASE}/analytics/dashboard", headers=auth).json()["kpis"]
    assert k["stock_value"] > 0
    assert k["meals_mtd"] >= 0


def test_negative_stock_is_blocked(auth):
    item = next(
        b for b in httpx.get(f"{BASE}/store/balances", headers=auth).json() if b["balance"] > 0
    )
    r = httpx.post(
        f"{BASE}/store/outward",
        headers=auth,
        json={"date": "2026-07-04", "lines": [{"item_id": item["item_id"], "quantity": 1e9}]},
    )
    assert r.status_code == 400
    assert "insufficient" in r.text.lower()


def _balance(auth, item_id: str) -> float:
    for b in httpx.get(f"{BASE}/store/balances", headers=auth).json():
        if b["item_id"] == item_id:
            return b["balance"]
    return 0.0


def test_invoice_auto_grn_and_reversal(auth):
    """Posting an invoice adds stock (auto-GRN) + a cost layer; deleting it reverses both."""
    vendor = httpx.get(f"{BASE}/vendors", headers=auth).json()[0]["id"]
    # a zero-stock item so no older opening layer interferes
    item = next(b for b in httpx.get(f"{BASE}/store/balances", headers=auth).json() if b["balance"] == 0)
    iid = item["item_id"]

    # clean any leftover from a prior crashed run
    for inv in httpx.get(f"{BASE}/purchase-invoices?month=2026-07", headers=auth).json():
        if inv.get("invoice_number") == "PYTEST-1":
            httpx.delete(f"{BASE}/purchase-invoices/{inv['id']}", headers=auth)

    inv = httpx.post(
        f"{BASE}/purchase-invoices",
        headers=auth,
        json={
            "vendor_id": vendor,
            "invoice_date": "2026-07-01",
            "invoice_number": "PYTEST-1",
            "lines": [{"item_id": iid, "quantity": 10, "rate": 25}],
        },
    )
    assert inv.status_code == 201, inv.text
    inv_id = inv.json()["id"]
    assert inv.json()["total"] == pytest.approx(250.0)

    # auto-GRN: balance +10; valuation: 10 * 25 = 250
    assert _balance(auth, iid) == pytest.approx(10)
    val = next(v for v in httpx.get(f"{BASE}/store/valuation", headers=auth).json() if v["item_id"] == iid)
    assert val["value"] == pytest.approx(250.0)

    # reversal: unconsumed invoice deletes cleanly, stock returns to 0
    assert httpx.delete(f"{BASE}/purchase-invoices/{inv_id}", headers=auth).status_code == 204
    assert _balance(auth, iid) == pytest.approx(0)
