import { useState } from 'react';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupsIcon from '@mui/icons-material/Groups';
import StraightenIcon from '@mui/icons-material/Straighten';
import CategoryIcon from '@mui/icons-material/Category';
import BadgeIcon from '@mui/icons-material/Badge';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import InsightsIcon from '@mui/icons-material/Insights';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleIcon from '@mui/icons-material/People';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import type { Role } from '../types';

const drawerWidth = 248;

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: Role[];
}
interface NavGroup {
  heading?: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { items: [{ to: '/', label: 'Dashboard', icon: <DashboardIcon /> }] },
  {
    heading: 'Procurement',
    items: [{ to: '/invoices', label: 'Purchase Invoices', icon: <ReceiptLongIcon /> }],
  },
  {
    heading: 'Store',
    items: [
      { to: '/stock', label: 'Stock Balances', icon: <Inventory2Icon /> },
      { to: '/valuation', label: 'Valuation', icon: <PriceCheckIcon /> },
      { to: '/outward', label: 'Issue / Outward', icon: <MoveToInboxIcon /> },
    ],
  },
  {
    heading: 'Consumption',
    items: [{ to: '/consumption', label: 'Daily Meals', icon: <RestaurantIcon /> }],
  },
  {
    heading: 'Masters',
    items: [
      { to: '/items', label: 'Items', icon: <StackedBarChartIcon /> },
      { to: '/vendors', label: 'Vendors', icon: <StorefrontIcon /> },
      { to: '/consumers', label: 'Consumers', icon: <GroupsIcon /> },
      { to: '/canteens', label: 'Canteens', icon: <RestaurantIcon /> },
      { to: '/staff', label: 'Canteen Staff', icon: <BadgeIcon /> },
      { to: '/units', label: 'Units', icon: <StraightenIcon /> },
      { to: '/categories', label: 'Categories', icon: <CategoryIcon /> },
      { to: '/item-aliases', label: 'Alias Curation', icon: <AutoFixHighIcon /> },
    ],
  },
  {
    heading: 'Reports',
    items: [
      { to: '/reports/cost-per-meal', label: 'Cost per Meal', icon: <InsightsIcon /> },
      { to: '/reports/contractor-charges', label: 'Contractor Charges', icon: <PaymentsIcon /> },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { to: '/users', label: 'Users', icon: <PeopleIcon />, roles: ['admin'] },
      { to: '/audit', label: 'Audit Log', icon: <FactCheckIcon />, roles: ['admin'] },
    ],
  },
];

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(true);
  const location = useLocation();

  const drawer = (
    <Box sx={{ width: drawerWidth }}>
      <Toolbar>
        <Typography variant="h6" noWrap fontWeight={800}>
          SSPL Kitchen
        </Typography>
      </Toolbar>
      <Divider />
      {NAV.map((group, gi) => {
        const items = group.items.filter((n) => !n.roles || hasRole(...n.roles));
        if (!items.length) return null;
        return (
          <List
            key={gi}
            dense
            subheader={
              group.heading ? (
                <ListSubheader disableSticky sx={{ bgcolor: 'transparent', fontWeight: 700, letterSpacing: 0.5 }}>
                  {group.heading.toUpperCase()}
                </ListSubheader>
              ) : undefined
            }
          >
            {items.map((n) => (
              <ListItemButton
                key={n.to}
                component={RouterLink}
                to={n.to}
                selected={location.pathname === n.to}
                sx={{ borderRadius: 2, mx: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 38 }}>{n.icon}</ListItemIcon>
                <ListItemText primary={n.label} />
              </ListItemButton>
            ))}
          </List>
        );
      })}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        color="default"
        sx={{
          width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
          ml: { sm: `${open ? drawerWidth : 0}px` },
          backdropFilter: 'blur(10px)',
          backgroundColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(28,24,19,0.72)' : 'rgba(255,255,255,0.72)',
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(!open)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }} fontWeight={700}>
            Kitchen &amp; Mess Management
          </Typography>
          <ThemeToggle />
          {user && (
            <Typography variant="body2" sx={{ mx: 2 }} color="text.secondary">
              {user.full_name} ({user.role})
            </Typography>
          )}
          <IconButton color="inherit" onClick={logout} title="Logout">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: 'transparent',
            borderRight: (t) => `1px solid ${t.palette.divider}`,
          },
        }}
      >
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, maxWidth: '100%', overflowX: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
