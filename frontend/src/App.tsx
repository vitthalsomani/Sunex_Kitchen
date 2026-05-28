import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ContractorsPage from './pages/ContractorsPage';
import CompanyGroupsPage from './pages/CompanyGroupsPage';
import UnitsPage from './pages/UnitsPage';
import ItemCategoriesPage from './pages/ItemCategoriesPage';
import ItemsPage from './pages/ItemsPage';
import MealConsumptionPage from './pages/MealConsumptionPage';
import PurchasesPage from './pages/PurchasesPage';
import StockPage from './pages/StockPage';
import MonthlyExpensesPage from './pages/MonthlyExpensesPage';
import ReportPage from './pages/ReportPage';
import UsersPage from './pages/UsersPage';

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
        <Route path="meal" element={<MealConsumptionPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="expenses" element={<MonthlyExpensesPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="contractors" element={<ContractorsPage />} />
        <Route path="company-groups" element={<CompanyGroupsPage />} />
        <Route path="units" element={<UnitsPage />} />
        <Route path="categories" element={<ItemCategoriesPage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['admin']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
