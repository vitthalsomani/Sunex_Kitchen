"""All Pydantic request/response models in one place."""
from __future__ import annotations

from datetime import date as Date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["admin", "data_entry", "viewer"]
Shift = Literal["Breakfast", "Lunch", "Dinner"]


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
    active: bool = True


class ItemUpdate(BaseModel):
    name: str | None = None
    category_id: str | None = None
    unit_id: str | None = None
    active: bool | None = None


class ItemOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    category_id: str
    unit_id: str
    active: bool = True
    category_name: str | None = None
    unit_name: str | None = None


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
