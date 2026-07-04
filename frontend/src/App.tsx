import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { SectionLoader } from './components/ui';

// Route-level code splitting: each page ships as its own chunk so the initial
// bundle stays small and navigation only fetches what it needs.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const StockBalancesPage = lazy(() => import('./pages/StockBalancesPage'));
const ValuationPage = lazy(() => import('./pages/ValuationPage'));
const OutwardPage = lazy(() => import('./pages/OutwardPage'));
const ConsumptionPage = lazy(() => import('./pages/ConsumptionPage'));
const ItemsPage = lazy(() => import('./pages/ItemsPage'));
const VendorsPage = lazy(() => import('./pages/VendorsPage'));
const ConsumersPage = lazy(() => import('./pages/ConsumersPage'));
const CanteensPage = lazy(() => import('./pages/CanteensPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const UnitsPage = lazy(() => import('./pages/UnitsPage'));
const ItemCategoriesPage = lazy(() => import('./pages/ItemCategoriesPage'));
const AliasCurationPage = lazy(() => import('./pages/AliasCurationPage'));
const CostPerMealPage = lazy(() => import('./pages/CostPerMealPage'));
const ContractorChargesPage = lazy(() => import('./pages/ContractorChargesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));

export default function App() {
  return (
    <Suspense fallback={<SectionLoader label="Loading…" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="stock" element={<StockBalancesPage />} />
          <Route path="valuation" element={<ValuationPage />} />
          <Route path="outward" element={<OutwardPage />} />
          <Route path="consumption" element={<ConsumptionPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="consumers" element={<ConsumersPage />} />
          <Route path="canteens" element={<CanteensPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="categories" element={<ItemCategoriesPage />} />
          <Route path="item-aliases" element={<AliasCurationPage />} />
          <Route path="reports/cost-per-meal" element={<CostPerMealPage />} />
          <Route path="reports/contractor-charges" element={<ContractorChargesPage />} />
          <Route
            path="users"
            element={
              <ProtectedRoute roles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit"
            element={
              <ProtectedRoute roles={['admin']}>
                <AuditPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
