import { api } from './client';
import type {
  BulkUploadResult,
  Item,
  LoginResponse,
  MealConsumption,
  MonthlyExpense,
  MonthlyReportRow,
  NamedMaster,
  Purchase,
  StockRow,
  User,
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

// ---------- items ----------
export const itemsApi = {
  list: () => api.get<Item[]>('/items').then((r) => r.data),
  create: (p: { name: string; category_id: string; unit_id: string; active?: boolean }) =>
    api.post<Item>('/items', p).then((r) => r.data),
  update: (id: string, p: Partial<Item>) =>
    api.patch<Item>(`/items/${id}`, p).then((r) => r.data),
  remove: (id: string) => api.delete(`/items/${id}`),
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
