import { api } from './client';
import type {
  BulkUploadResult,
  Consumer,
  Consumption,
  ContractorChargeRow,
  CostPerMealRow,
  Dashboard,
  Item,
  ItemAlias,
  LoginResponse,
  MealConsumption,
  MonthlyExpense,
  MonthlyReportRow,
  NamedMaster,
  Outward,
  Purchase,
  PurchaseInvoice,
  SeriesPoint,
  Staff,
  StockBalance,
  StockMovement,
  StockRow,
  User,
  Valuation,
  Vendor,
} from '../types';

// ---------- auth ----------
export async function login(username: string, password: string): Promise<LoginResponse> {
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);
  const { data } = await api.post<LoginResponse>('/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function fetchMe(): Promise<User> {
  return (await api.get<User>('/users/me')).data;
}

// ---------- users ----------
export const usersApi = {
  list: () => api.get<User[]>('/users').then((r) => r.data),
  create: (p: Partial<User> & { password: string }) =>
    api.post<User>('/users', p).then((r) => r.data),
  update: (id: string, p: Partial<User> & { password?: string }) =>
    api.patch<User>(`/users/${id}`, p).then((r) => r.data),
  remove: (id: string) => api.delete(`/users/${id}`),
};

// ---------- generic named masters ----------
function masterApi(prefix: string) {
  return {
    list: () => api.get<NamedMaster[]>(`/${prefix}`).then((r) => r.data),
    create: (p: { name: string; code?: string; active?: boolean }) =>
      api.post<NamedMaster>(`/${prefix}`, p).then((r) => r.data),
    update: (id: string, p: Partial<NamedMaster>) =>
      api.patch<NamedMaster>(`/${prefix}/${id}`, p).then((r) => r.data),
    remove: (id: string) => api.delete(`/${prefix}/${id}`),
    bulkUpload: async (file: File): Promise<BulkUploadResult> => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<BulkUploadResult>(`/${prefix}/bulk-upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
  };
}

export const contractorsApi = masterApi('contractors');
export const companyGroupsApi = masterApi('company-groups');
export const unitsApi = masterApi('units');
export const itemCategoriesApi = masterApi('item-categories');
export const canteensApi = masterApi('canteens');

// ---------- items ----------
export const itemsApi = {
  list: () => api.get<Item[]>('/items').then((r) => r.data),
  create: (p: {
    name: string;
    category_id: string;
    unit_id: string;
    min_stock?: number | null;
    max_stock?: number | null;
    active?: boolean;
  }) => api.post<Item>('/items', p).then((r) => r.data),
  update: (id: string, p: Partial<Item>) =>
    api.patch<Item>(`/items/${id}`, p).then((r) => r.data),
  remove: (id: string) => api.delete(`/items/${id}`),
};

// ---------- vendors ----------
export const vendorsApi = {
  list: () => api.get<Vendor[]>('/vendors').then((r) => r.data),
  create: (p: Partial<Vendor> & { name: string }) =>
    api.post<Vendor>('/vendors', p).then((r) => r.data),
  update: (id: string, p: Partial<Vendor>) =>
    api.patch<Vendor>(`/vendors/${id}`, p).then((r) => r.data),
  remove: (id: string) => api.delete(`/vendors/${id}`),
};

// ---------- consumers ----------
export const consumersApi = {
  list: () => api.get<Consumer[]>('/consumers').then((r) => r.data),
  create: (p: Partial<Consumer> & { name: string }) =>
    api.post<Consumer>('/consumers', p).then((r) => r.data),
  update: (id: string, p: Partial<Consumer>) =>
    api.patch<Consumer>(`/consumers/${id}`, p).then((r) => r.data),
  remove: (id: string) => api.delete(`/consumers/${id}`),
};

// ---------- staff ----------
export const staffApi = {
  list: () => api.get<Staff[]>('/staff').then((r) => r.data),
  create: (p: Partial<Staff> & { name: string; canteen_id: string }) =>
    api.post<Staff>('/staff', p).then((r) => r.data),
  update: (id: string, p: Partial<Staff>) =>
    api.patch<Staff>(`/staff/${id}`, p).then((r) => r.data),
  remove: (id: string) => api.delete(`/staff/${id}`),
};

// ---------- item aliases + curation ----------
export interface ReviewItem {
  item_id: string;
  name: string;
  balance: number;
  suggestion: { item_id: string; name: string } | null;
}
export interface UnmatchedName {
  name: string;
  count: number;
  suggestion: { item_id: string; name: string } | null;
}
export const itemAliasesApi = {
  list: () => api.get<ItemAlias[]>('/item-aliases').then((r) => r.data),
  create: (p: { alias: string; item_id: string }) =>
    api.post<ItemAlias>('/item-aliases', p).then((r) => r.data),
  remove: (id: string) => api.delete(`/item-aliases/${id}`),
  reviewItems: () => api.get<ReviewItem[]>('/item-aliases/review-items').then((r) => r.data),
  unmatched: () => api.get<UnmatchedName[]>('/item-aliases/unmatched-purchases').then((r) => r.data),
  merge: (source_item_id: string, target_item_id: string) =>
    api.post('/item-aliases/merge', { source_item_id, target_item_id }).then((r) => r.data),
  reseed: () =>
    api
      .post<{ items_valued: number; layers: number; total_value: number }>('/item-aliases/reseed-valuation')
      .then((r) => r.data),
};

// ---------- store / stock ----------
export const storeApi = {
  balances: () => api.get<StockBalance[]>('/store/balances').then((r) => r.data),
  lowStock: () => api.get<StockBalance[]>('/store/low-stock').then((r) => r.data),
  valuation: () => api.get<Valuation[]>('/store/valuation').then((r) => r.data),
  ledger: (itemId: string, params?: { from?: string; to?: string }) =>
    api
      .get<StockMovement[]>('/store/ledger', { params: { item_id: itemId, ...params } })
      .then((r) => r.data),
  inward: (p: { date: string; item_id: string; quantity: number; rate?: number | null; received_by?: string; note?: string }) =>
    api.post('/store/inward', p).then((r) => r.data),
  outward: (p: {
    date: string;
    canteen_id?: string | null;
    issued_by?: string;
    lines: { item_id: string; quantity: number }[];
    note?: string;
  }) => api.post<Outward>('/store/outward', p).then((r) => r.data),
  listOutward: (params?: { month?: string }) =>
    api.get<Outward[]>('/store/outward', { params }).then((r) => r.data),
  adjust: (p: { date: string; item_id: string; qty_delta: number; reason: string }) =>
    api.post('/store/adjustments', p).then((r) => r.data),
};

// ---------- procurement (purchase invoices) ----------
export const invoicesApi = {
  list: (params?: { month?: string }) =>
    api.get<PurchaseInvoice[]>('/purchase-invoices', { params }).then((r) => r.data),
  get: (id: string) => api.get<PurchaseInvoice>(`/purchase-invoices/${id}`).then((r) => r.data),
  create: (p: {
    vendor_id: string;
    invoice_date: string;
    invoice_number?: string;
    invoice_photo?: string;
    lines: { item_id: string; quantity: number; rate: number }[];
    remarks?: string;
  }) => api.post<PurchaseInvoice>('/purchase-invoices', p).then((r) => r.data),
  remove: (id: string) => api.delete(`/purchase-invoices/${id}`),
};

// ---------- uploads ----------
export const uploadsApi = {
  upload: async (file: File): Promise<{ url: string; path: string }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as { url: string; path: string };
  },
};

// ---------- consumption ----------
export const consumptionApi = {
  list: (params?: { month?: string; from?: string; to?: string }) =>
    api.get<Consumption[]>('/consumption', { params }).then((r) => r.data),
  upsert: (p: {
    date: string;
    shift: string;
    canteen_id?: string | null;
    lines: { consumer_id: string; count: number }[];
    notes?: string;
  }) => api.put<Consumption>('/consumption', p).then((r) => r.data),
  remove: (id: string) => api.delete(`/consumption/${id}`),
};

// ---------- audit ----------
export interface AuditEntry {
  id: string;
  ts: string | null;
  user: string | null;
  method: string;
  path: string;
  status: number;
}
export const auditApi = {
  list: (limit = 200) => api.get<AuditEntry[]>('/audit', { params: { limit } }).then((r) => r.data),
};

// ---------- analytics ----------
export const analyticsApi = {
  dashboard: () => api.get<Dashboard>('/analytics/dashboard').then((r) => r.data),
  costPerMeal: (from: string, to: string) =>
    api.get<CostPerMealRow[]>('/analytics/cost-per-meal', { params: { from, to } }).then((r) => r.data),
  contractorCharges: (month: string) =>
    api.get<ContractorChargeRow[]>('/analytics/contractor-charges', { params: { month } }).then((r) => r.data),
  consumptionTrend: (days = 30) =>
    api.get<SeriesPoint[]>('/analytics/consumption-trend', { params: { days } }).then((r) => r.data),
  topConsumed: (params?: { month?: string; limit?: number }) =>
    api.get<SeriesPoint[]>('/analytics/top-consumed', { params }).then((r) => r.data),
  purchaseByCategory: (params?: { month?: string }) =>
    api.get<SeriesPoint[]>('/analytics/purchase-by-category', { params }).then((r) => r.data),
};

// ---------- meal consumption ----------
export const mealApi = {
  list: (params?: { from?: string; to?: string; month?: string }) =>
    api.get<MealConsumption[]>('/meal-consumption', { params }).then((r) => r.data),
  upsert: (p: {
    date: string;
    shift: string;
    contractor_counts: { ref_id: string; count: number }[];
    company_counts: { ref_id: string; count: number }[];
    notes?: string;
  }) => api.put<MealConsumption>('/meal-consumption', p).then((r) => r.data),
  remove: (id: string) => api.delete(`/meal-consumption/${id}`),
};

// ---------- purchases ----------
export const purchasesApi = {
  list: (params?: { from?: string; to?: string; month?: string }) =>
    api.get<Purchase[]>('/purchases', { params }).then((r) => r.data),
  create: (p: Omit<Purchase, 'id' | 'amount' | 'item_name' | 'category_name' | 'unit_name'>) =>
    api.post<Purchase>('/purchases', p).then((r) => r.data),
  update: (id: string, p: Partial<Purchase>) =>
    api.patch<Purchase>(`/purchases/${id}`, p).then((r) => r.data),
  remove: (id: string) => api.delete(`/purchases/${id}`),
};

// ---------- stock ----------
export const stockApi = {
  list: (month: string) =>
    api.get<StockRow[]>('/stock', { params: { month } }).then((r) => r.data),
  upsert: (p: {
    month: string;
    item_id: string;
    opening_qty: number;
    opening_value: number;
    closing_qty: number;
    closing_value: number;
  }) => api.put<StockRow>('/stock', p).then((r) => r.data),
  remove: (id: string) => api.delete(`/stock/${id}`),
};

// ---------- monthly expenses ----------
export const monthlyExpensesApi = {
  list: () => api.get<MonthlyExpense[]>('/monthly-expenses').then((r) => r.data),
  upsert: (p: {
    month: string;
    manpower_salary: number;
    contractor_payment: number;
    notes?: string;
  }) => api.put<MonthlyExpense>('/monthly-expenses', p).then((r) => r.data),
  remove: (id: string) => api.delete(`/monthly-expenses/${id}`),
};

// ---------- reports ----------
export const reportsApi = {
  monthlyCost: (month: string) =>
    api.get<MonthlyReportRow>('/reports/monthly-cost', { params: { month } }).then((r) => r.data),
  costAnalysis: (from: string, to: string) =>
    api
      .get<MonthlyReportRow[]>('/reports/cost-analysis', { params: { from, to } })
      .then((r) => r.data),
};
