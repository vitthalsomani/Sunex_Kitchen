import type { ReactNode } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CategoryIcon from '@mui/icons-material/Category';
import InsightsIcon from '@mui/icons-material/Insights';
import ShieldIcon from '@mui/icons-material/Shield';

import type { Role } from './types';

export interface NavTab {
  label: string;
  to: string;
  roles?: Role[];
}
export interface NavSection {
  key: string;
  label: string;
  icon: ReactNode;
  to: string; // where the topbar section link navigates (its first screen)
  roles?: Role[];
  tabs: NavTab[]; // sub-screens; length <= 1 => no sticky tab row
}

/**
 * Single source of navigation truth. Projected two ways: primary sections in the
 * TopBar, and the active section's sub-screens in the sticky SectionTabs.
 * Routes and role-gating mirror App.tsx exactly — nav is presentation only.
 */
export const SECTIONS: NavSection[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, to: '/', tabs: [] },
  {
    key: 'procurement',
    label: 'Procurement',
    icon: <ReceiptLongIcon />,
    to: '/invoices',
    tabs: [{ label: 'Purchase Invoices', to: '/invoices' }],
  },
  {
    key: 'store',
    label: 'Store',
    icon: <Inventory2Icon />,
    to: '/stock',
    tabs: [
      { label: 'Balances', to: '/stock' },
      { label: 'Valuation', to: '/valuation' },
      { label: 'Issue / Outward', to: '/outward' },
    ],
  },
  {
    key: 'consumption',
    label: 'Consumption',
    icon: <RestaurantIcon />,
    to: '/consumption',
    tabs: [{ label: 'Daily Meals', to: '/consumption' }],
  },
  {
    key: 'masters',
    label: 'Masters',
    icon: <CategoryIcon />,
    to: '/items',
    tabs: [
      { label: 'Items', to: '/items' },
      { label: 'Vendors', to: '/vendors' },
      { label: 'Consumers', to: '/consumers' },
      { label: 'Canteens', to: '/canteens' },
      { label: 'Staff', to: '/staff' },
      { label: 'Units', to: '/units' },
      { label: 'Categories', to: '/categories' },
      { label: 'Alias Curation', to: '/item-aliases' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: <InsightsIcon />,
    to: '/reports/cost-per-meal',
    tabs: [
      { label: 'Cost per Meal', to: '/reports/cost-per-meal' },
      { label: 'Contractor Charges', to: '/reports/contractor-charges' },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    icon: <ShieldIcon />,
    to: '/users',
    roles: ['admin'],
    tabs: [
      { label: 'Users', to: '/users', roles: ['admin'] },
      { label: 'Audit Log', to: '/audit', roles: ['admin'] },
    ],
  },
];

/** The section that owns the current path (by longest matching tab/route). */
export function activeSection(pathname: string): NavSection {
  let best = SECTIONS[0];
  let bestLen = -1;
  for (const s of SECTIONS) {
    const routes = s.tabs.length ? s.tabs.map((t) => t.to) : [s.to];
    for (const r of routes) {
      const match = r === '/' ? pathname === '/' : pathname === r || pathname.startsWith(r + '/');
      if (match && r.length > bestLen) {
        best = s;
        bestLen = r.length;
      }
    }
  }
  return best;
}
