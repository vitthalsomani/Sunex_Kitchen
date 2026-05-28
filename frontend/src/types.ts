export type Role = 'admin' | 'data_entry' | 'viewer';
export type Shift = 'Breakfast' | 'Lunch' | 'Dinner';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  email?: string | null;
  active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  username: string;
  full_name: string;
}

export interface NamedMaster {
  id: string;
  name: string;
  code?: string | null;
  active: boolean;
}

export interface Item {
  id: string;
  name: string;
  category_id: string;
  unit_id: string;
  category_name?: string;
  unit_name?: string;
  active: boolean;
}

export interface HeadcountEntry {
  ref_id: string;
  count: number;
}

export interface MealConsumption {
  id: string;
  date: string; // YYYY-MM-DD
  shift: Shift;
  contractor_counts: HeadcountEntry[];
  company_counts: HeadcountEntry[];
  total: number;
  notes?: string | null;
}

export interface Purchase {
  id: string;
  date: string;
  item_id: string;
  item_name?: string;
  category_id?: string;
  category_name?: string;
  unit_name?: string;
  quantity: number;
  rate: number;
  amount: number;
  vendor?: string | null;
  bill_ref?: string | null;
  notes?: string | null;
}

export interface StockRow {
  id: string;
  month: string;
  item_id: string;
  item_name?: string;
  category_id?: string;
  category_name?: string;
  unit_name?: string;
  opening_qty: number;
  opening_value: number;
  purchase_qty: number;
  purchase_value: number;
  closing_qty: number;
  closing_value: number;
  consumption_qty: number;
  consumption_value: number;
}

export interface MonthlyExpense {
  id: string;
  month: string;
  manpower_salary: number;
  contractor_payment: number;
  notes?: string | null;
}

export interface MonthlyReportRow {
  month: string;
  total_meals: number;
  category_expenses: { category_id: string; category_name: string; value: number }[];
  grocery_veg_expense: number;
  gas_coal_expense: number;
  oil_expense: number;
  other_category_expense: number;
  manpower_salary: number;
  contractor_payment: number;
  total_expense: number;
  cost_per_meal: number;
}

export interface BulkUploadResult {
  inserted: number;
  skipped: number;
  errors: string[];
}
