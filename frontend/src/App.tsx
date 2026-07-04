import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/InvoicesPage';
import StockBalancesPage from './pages/StockBalancesPage';
import ValuationPage from './pages/ValuationPage';
import OutwardPage from './pages/OutwardPage';
import ConsumptionPage from './pages/ConsumptionPage';
import ItemsPage from './pages/ItemsPage';
import VendorsPage from './pages/VendorsPage';
import ConsumersPage from './pages/ConsumersPage';
import CanteensPage from './pages/CanteensPage';
import StaffPage from './pages/StaffPage';
import UnitsPage from './pages/UnitsPage';
import ItemCategoriesPage from './pages/ItemCategoriesPage';
import AliasCurationPage from './pages/AliasCurationPage';
import CostPerMealPage from './pages/CostPerMealPage';
import ContractorChargesPage from './pages/ContractorChargesPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';

export default function App() {
  return (
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
        {/* Procurement */}
        <Route path="invoices" element={<InvoicesPage />} />
        {/* Store */}
        <Route path="stock" element={<StockBalancesPage />} />
        <Route path="valuation" element={<ValuationPage />} />
        <Route path="outward" element={<OutwardPage />} />
        {/* Consumption */}
        <Route path="consumption" element={<ConsumptionPage />} />
        {/* Masters */}
        <Route path="items" element={<ItemsPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="consumers" element={<ConsumersPage />} />
        <Route path="canteens" element={<CanteensPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="units" element={<UnitsPage />} />
        <Route path="categories" element={<ItemCategoriesPage />} />
        <Route path="item-aliases" element={<AliasCurationPage />} />
        {/* Reports */}
        <Route path="reports/cost-per-meal" element={<CostPerMealPage />} />
        <Route path="reports/contractor-charges" element={<ContractorChargesPage />} />
        {/* Admin */}
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
  );
}
