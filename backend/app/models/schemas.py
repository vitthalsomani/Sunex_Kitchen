"""All Pydantic request/response models in one place."""
from __future__ import annotations

from datetime import date as Date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal[
    "admin",
    "store_manager",
    "purchase",
    "canteen_incharge",
    "data_entry",
    "viewer",
]
Shift = Literal["Breakfast", "Lunch", "Dinner"]
ConsumerType = Literal["contractor", "service", "company_group"]
MovementSource = Literal["purchase", "outward", "adjustment", "opening"]


# ---------- Auth / Users ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    username: str
    full_name: str


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    full_name: str
    role: Role
    password: str = Field(min_length=4)
    email: EmailStr | None = None
    active: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: Role | None = None
    password: str | None = Field(default=None, min_length=4)
    email: EmailStr | None = None
    active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    full_name: str
    role: Role
    email: EmailStr | None = None
    active: bool


# ---------- Generic named master ----------
class NamedMasterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    code: str | None = None
    active: bool = True


class NamedMasterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    code: str | None = None
    active: bool | None = None


class NamedMasterOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    code: str | None = None
    active: bool = True


# ---------- Item ----------
class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    category_id: str
    unit_id: str
    min_stock: float | None = Field(default=None, ge=0)  # reorder low level
    max_stock: float | None = Field(default=None, ge=0)  # reorder high level
    active: bool = True


class ItemUpdate(BaseModel):
    name: str | None = None
    category_id: str | None = None
    unit_id: str | None = None
    min_stock: float | None = Field(default=None, ge=0)
    max_stock: float | None = Field(default=None, ge=0)
    active: bool | None = None


class ItemOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    category_id: str
    unit_id: str
    min_stock: float | None = None
    max_stock: float | None = None
    active: bool = True
    category_name: str | None = None
    unit_name: str | None = None


# ---------- Item Alias (spelling-variant normalisation) ----------
class ItemAliasCreate(BaseModel):
    alias: str = Field(min_length=1, max_length=128)
    item_id: str


class ItemAliasOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    alias: str
    item_id: str
    item_name: str | None = None


# ---------- Vendor / Party ----------
class VendorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    code: str | None = None
    phone: str | None = None
    address: str | None = None
    active: bool = True


class VendorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    code: str | None = None
    phone: str | None = None
    address: str | None = None
    active: bool | None = None


class VendorOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    code: str | None = None
    phone: str | None = None
    address: str | None = None
    active: bool = True


# ---------- Consumer (contractor gang / service / company group) ----------
class ConsumerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    code: str | None = None
    type: ConsumerType = "contractor"
    billable: bool = False  # back-charged for meals?
    meal_rate: float | None = Field(default=None, ge=0)  # per-meal back-charge rate
    active: bool = True


class ConsumerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    code: str | None = None
    type: ConsumerType | None = None
    billable: bool | None = None
    meal_rate: float | None = Field(default=None, ge=0)
    active: bool | None = None


class ConsumerOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    code: str | None = None
    type: ConsumerType = "contractor"
    billable: bool = False
    meal_rate: float | None = None
    active: bool = True


# ---------- Canteen Staff ----------
class StaffCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    canteen_id: str
    occupation: str | None = None  # Chef / Helper / Supervisor
    shift_time: str | None = None
    rest_time: str | None = None
    active: bool = True


class StaffUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    canteen_id: str | None = None
    occupation: str | None = None
    shift_time: str | None = None
    rest_time: str | None = None
    active: bool | None = None


class StaffOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    canteen_id: str
    canteen_name: str | None = None
    occupation: str | None = None
    shift_time: str | None = None
    rest_time: str | None = None
    active: bool = True


# ---------- Meal Consumption ----------
class HeadcountEntry(BaseModel):
    ref_id: str  # contractor id or company-group id
    count: int = Field(ge=0)


class MealConsumptionUpsert(BaseModel):
    date: Date
    shift: Shift
    contractor_counts: list[HeadcountEntry] = []
    company_counts: list[HeadcountEntry] = []
    notes: str | None = None


class MealConsumptionOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: Date
    shift: Shift
    contractor_counts: list[HeadcountEntry]
    company_counts: list[HeadcountEntry]
    total: int
    notes: str | None = None


# ---------- Purchase ----------
class PurchaseCreate(BaseModel):
    date: Date
    item_id: str
    quantity: float = Field(gt=0)
    rate: float = Field(ge=0)
    vendor: str | None = None
    bill_ref: str | None = None
    notes: str | None = None


class PurchaseUpdate(BaseModel):
    date: Date | None = None  # noqa: E501
    item_id: str | None = None
    quantity: float | None = Field(default=None, gt=0)
    rate: float | None = Field(default=None, ge=0)
    vendor: str | None = None
    bill_ref: str | None = None
    notes: str | None = None


class PurchaseOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: Date
    item_id: str
    item_name: str | None = None
    category_id: str | None = None
    category_name: str | None = None
    unit_name: str | None = None
    quantity: float
    rate: float
    amount: float
    vendor: str | None = None
    bill_ref: str | None = None
    notes: str | None = None


# ---------- Monthly Stock ----------
class StockUpsert(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")  # YYYY-MM
    item_id: str
    opening_qty: float = Field(ge=0)
    opening_value: float = Field(ge=0, default=0)
    closing_qty: float = Field(ge=0)
    closing_value: float = Field(ge=0, default=0)


class StockOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    month: str
    item_id: str
    item_name: str | None = None
    category_id: str | None = None
    category_name: str | None = None
    unit_name: str | None = None
    opening_qty: float
    opening_value: float
    purchase_qty: float = 0
    purchase_value: float = 0
    closing_qty: float
    closing_value: float
    consumption_qty: float = 0
    consumption_value: float = 0


# ---------- Monthly Expenses ----------
class MonthlyExpenseUpsert(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    manpower_salary: float = Field(ge=0, default=0)
    contractor_payment: float = Field(ge=0, default=0)
    notes: str | None = None


class MonthlyExpenseOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    month: str
    manpower_salary: float
    contractor_payment: float
    notes: str | None = None


# ---------- Report ----------
class CategoryExpense(BaseModel):
    category_id: str
    category_name: str
    value: float


class MonthlyReportRow(BaseModel):
    month: str
    total_meals: int
    category_expenses: list[CategoryExpense]
    grocery_veg_expense: float = 0
    gas_coal_expense: float = 0
    oil_expense: float = 0
    other_category_expense: float = 0
    manpower_salary: float = 0
    contractor_payment: float = 0
    total_expense: float = 0
    cost_per_meal: float = 0


class BulkUploadResult(BaseModel):
    inserted: int
    skipped: int
    errors: list[str] = []


# ==================================================================
# P4 — Analytics / Reports / Dashboard
# ==================================================================
class KpiCard(BaseModel):
    stock_value: float
    items_below_min: int
    meals_mtd: int
    meals_today: int
    purchases_mtd_value: float
    food_cost_mtd: float
    cost_per_meal_mtd: float
    invoices_mtd: int


class RecentActivity(BaseModel):
    kind: str  # inward | outward | invoice
    date: Date
    detail: str
    amount: float | None = None


class DashboardOut(BaseModel):
    kpis: KpiCard
    low_stock: list[StockBalanceOut]
    recent: list[RecentActivity]


class CostPerMealRow(BaseModel):
    month: str
    meals: int
    food_cost: float          # FIFO cost of stock issued that month
    cost_per_meal: float
    purchases_value: float     # invoiced purchases that month


class ContractorChargeRow(BaseModel):
    consumer_id: str
    consumer_name: str
    meals: int
    meal_rate: float
    amount: float


class SeriesPoint(BaseModel):
    label: str
    value: float


# ==================================================================
# P1 — Store / Inventory (perpetual stock ledger)
# ==================================================================

# ---------- Manual Inward (store receipt) ----------
class InwardCreate(BaseModel):
    date: Date
    item_id: str
    quantity: float = Field(gt=0)
    rate: float | None = Field(default=None, ge=0)  # optional cost (P2 uses invoices)
    received_by: str | None = None
    note: str | None = None


# ---------- Outward / Issue (header + lines) ----------
class OutwardLine(BaseModel):
    item_id: str
    quantity: float = Field(gt=0)


class OutwardCreate(BaseModel):
    date: Date
    canteen_id: str | None = None  # which canteen the stock was issued to
    issued_by: str | None = None
    lines: list[OutwardLine] = Field(min_length=1)
    note: str | None = None


class OutwardOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: Date
    canteen_id: str | None = None
    canteen_name: str | None = None
    issued_by: str | None = None
    lines: list[OutwardLine]
    total_cost: float | None = None  # FIFO cost of issued stock
    note: str | None = None


# ---------- Stock Adjustment ----------
class StockAdjustmentCreate(BaseModel):
    date: Date
    item_id: str
    qty_delta: float  # +ve = increase, -ve = decrease
    reason: str = Field(min_length=1)


# ---------- Ledger movement (read model) ----------
class StockMovementOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: Date
    item_id: str
    item_name: str | None = None
    direction: Literal["in", "out"]
    quantity: float
    source: MovementSource
    ref_id: str | None = None
    note: str | None = None
    balance_after: float | None = None  # populated by ledger endpoint (running)


# ---------- Current balance (read model) ----------
class StockBalanceOut(BaseModel):
    item_id: str
    item_name: str
    category_name: str | None = None
    unit_name: str | None = None
    balance: float
    min_stock: float | None = None
    max_stock: float | None = None
    low: bool = False  # balance <= min_stock


# ==================================================================
# P2 — Procurement (invoice purchases) + FIFO costing
# ==================================================================

# ---------- Purchase Invoice (header + lines) ----------
class PurchaseInvoiceLine(BaseModel):
    item_id: str
    quantity: float = Field(gt=0)
    rate: float = Field(ge=0)  # per unit; amount = qty*rate (server-computed)


class PurchaseInvoiceLineOut(BaseModel):
    item_id: str
    item_name: str | None = None
    quantity: float
    rate: float
    amount: float


class PurchaseInvoiceCreate(BaseModel):
    vendor_id: str
    invoice_date: Date
    invoice_number: str | None = None
    invoice_photo: str | None = None  # URL / stored path
    lines: list[PurchaseInvoiceLine] = Field(min_length=1)
    remarks: str | None = None


class PurchaseInvoiceOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    vendor_id: str
    vendor_name: str | None = None
    invoice_date: Date
    invoice_number: str | None = None
    invoice_photo: str | None = None
    lines: list[PurchaseInvoiceLineOut]
    total: float
    remarks: str | None = None


# ==================================================================
# P3 — Daily meal consumption (per date x shift x consumer)
# ==================================================================
class ConsumptionLine(BaseModel):
    consumer_id: str
    count: int = Field(ge=0)


class ConsumptionUpsert(BaseModel):
    date: Date
    shift: Shift
    canteen_id: str | None = None  # optional; historical data has no canteen split
    lines: list[ConsumptionLine] = []
    notes: str | None = None


class ConsumptionLineOut(BaseModel):
    consumer_id: str
    consumer_name: str | None = None
    count: int


class ConsumptionOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: Date
    shift: Shift
    canteen_id: str | None = None
    canteen_name: str | None = None
    lines: list[ConsumptionLineOut]
    total: int
    notes: str | None = None


# ---------- Valuation (FIFO read model) ----------
class ValuationOut(BaseModel):
    item_id: str
    item_name: str
    category_name: str | None = None
    unit_name: str | None = None
    balance: float          # on-hand qty (from ledger)
    costed_qty: float       # qty covered by open FIFO layers
    value: float            # Σ remaining_qty * rate over open layers
    avg_cost: float         # value / costed_qty (0 if none)
