export type Role =
  | 'admin'
  | 'store_manager'
  | 'purchase'
  | 'canteen_incharge'
  | 'data_entry'
  | 'viewer';
export type Shift = 'Breakfast' | 'Lunch' | 'Dinner';
export type ConsumerType = 'contractor' | 'service' | 'company_group';

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
  min_stock?: number | null;
  max_stock?: number | null;
  category_name?: string;
  unit_name?: string;
  active: boolean;
}

// ---------- ERP redesign masters ----------
export interface Vendor {
  id: string;
  name: string;
  code?: string | null;
  phone?: string | null;
  address?: string | null;
  active: boolean;
}

export interface Consumer {
  id: string;
  name: string;
  code?: string | null;
  type: ConsumerType;
  billable: boolean;
  meal_rate?: number | null;
  active: boolean;
}

export interface Staff {
  id: string;
  name: string;
  canteen_id: string;
  canteen_name?: string | null;
  occupation?: string | null;
  shift_time?: string | null;
  rest_time?: string | null;
  active: boolean;
}

export interface ItemAlias {
  id: string;
  alias: string;
  item_id: string;
  item_name?: string | null;
}

// ---------- store / stock ----------
export interface StockBalance {
  item_id: string;
  item_name: string;
  category_name?: string | null;
  unit_name?: string | null;
  balance: number;
  min_stock?: number | null;
  max_stock?: number | null;
  low: boolean;
}

export interface Valuation extends StockBalance {
  costed_qty: number;
  value: number;
  avg_cost: number;
}

export interface StockMovement {
  id: string;
  date: string;
  item_id: string;
  item_name?: string | null;
  direction: 'in' | 'out';
  quantity: number;
  source: 'purchase' | 'outward' | 'adjustment' | 'opening';
  ref_id?: string | null;
  note?: string | null;
  balance_after?: number | null;
}

export interface OutwardLine {
  item_id: string;
  quantity: number;
}
export interface Outward {
  id: string;
  date: string;
  canteen_id?: string | null;
  canteen_name?: string | null;
  issued_by?: string | null;
  lines: OutwardLine[];
  total_cost?: number | null;
  note?: string | null;
}

// ---------- procurement ----------
export interface PurchaseInvoiceLine {
  item_id: string;
  item_name?: string | null;
  quantity: number;
  rate: number;
  amount: number;
}
export interface PurchaseInvoice {
  id: string;
  vendor_id: string;
  vendor_name?: string | null;
  invoice_date: string;
  invoice_number?: string | null;
  invoice_photo?: string | null;
  lines: PurchaseInvoiceLine[];
  total: number;
  remarks?: string | null;
}

// ---------- consumption ----------
export interface ConsumptionLine {
  consumer_id: string;
  consumer_name?: string | null;
  count: number;
}
export interface Consumption {
  id: string;
  date: string;
  shift: Shift;
  canteen_id?: string | null;
  canteen_name?: string | null;
  lines: ConsumptionLine[];
  total: number;
  notes?: string | null;
}

// ---------- analytics ----------
export interface DashboardKpis {
  stock_value: number;
  items_below_min: number;
  meals_mtd: number;
  meals_today: number;
  purchases_mtd_value: number;
  food_cost_mtd: number;
  cost_per_meal_mtd: number;
  invoices_mtd: number;
}
export interface RecentActivity {
  kind: string;
  date: string;
  detail: string;
  amount?: number | null;
}
export interface Dashboard {
  kpis: DashboardKpis;
  low_stock: StockBalance[];
  recent: RecentActivity[];
}
export interface CostPerMealRow {
  month: string;
  meals: number;
  food_cost: number;
  cost_per_meal: number;
  purchases_value: number;
}
export interface ContractorChargeRow {
  consumer_id: string;
  consumer_name: string;
  meals: number;
  meal_rate: number;
  amount: number;
}
export interface SeriesPoint {
  label: string;
  value: number;
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
