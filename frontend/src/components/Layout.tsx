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
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import BusinessIcon from '@mui/icons-material/Business';
import StraightenIcon from '@mui/icons-material/Straighten';
import CategoryIcon from '@mui/icons-material/Category';
import InventoryIcon from '@mui/icons-material/Inventory';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import InsightsIcon from '@mui/icons-material/Insights';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import PeopleIcon from '@mui/icons-material/People';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: ('admin' | 'data_entry' | 'viewer')[];
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/meal', label: 'Daily Meals', icon: <RestaurantIcon /> },
  { to: '/purchases', label: 'Purchases', icon: <ReceiptLongIcon /> },
  { to: '/stock', label: 'Monthly Stock', icon: <InventoryIcon /> },
  { to: '/expenses', label: 'Monthly Expenses', icon: <AccountBalanceIcon /> },
  { to: '/report', label: 'Cost Report', icon: <InsightsIcon /> },
  { to: '/contractors', label: 'Contractors', icon: <BusinessIcon /> },
  { to: '/company-groups', label: 'Company Groups', icon: <GroupIcon /> },
  { to: '/units', label: 'Units', icon: <StraightenIcon /> },
  { to: '/categories', label: 'Item Categories', icon: <CategoryIcon /> },
  { to: '/items', label: 'Items', icon: <StackedBarChartIcon /> },
  { to: '/users', label: 'Users', icon: <PeopleIcon />, roles: ['admin'] },
];

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(true);
  const location = useLocation();

  const items = NAV.filter((n) => !n.roles || hasRole(...n.roles));

  const drawer = (
    <Box sx={{ width: drawerWidth }}>
      <Toolbar>
        <Typography variant="h6" noWrap>
          SSPL Kitchen
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {items.map((n) => (
          <ListItemButton
            key={n.to}
            component={RouterLink}
            to={n.to}
            selected={location.pathname === n.to}
          >
            <ListItemIcon>{n.icon}</ListItemIcon>
            <ListItemText primary={n.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{ width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` }, ml: { sm: `${open ? drawerWidth : 0}px` } }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(!open)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Mess Management
          </Typography>
          {user && (
            <Typography variant="body2" sx={{ mr: 2 }}>
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
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
