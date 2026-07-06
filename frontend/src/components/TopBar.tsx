import { useState } from 'react';
import {
  AppBar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { motion, useReducedMotion } from 'framer-motion';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { SECTIONS, activeSection } from '../nav';

export const TOPBAR_H = 60;
const logo = `${import.meta.env.BASE_URL}favicon.png`;

export default function TopBar() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const reduce = useReducedMotion();
  const [drawer, setDrawer] = useState(false);

  const sections = SECTIONS.filter((s) => !s.roles || hasRole(...s.roles));
  const active = activeSection(location.pathname);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      color="default"
      sx={{
        height: TOPBAR_H,
        justifyContent: 'center',
        backgroundColor: 'background.paper',
        borderBottom: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      <Toolbar sx={{ minHeight: TOPBAR_H, gap: 1 }}>
        {/* brand */}
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          component={RouterLink}
          to="/"
          sx={{ textDecoration: 'none', color: 'text.primary', mr: 2 }}
        >
          <Box
            component="img"
            src={logo}
            alt="SSPL Kitchen"
            sx={{
              width: 40,
              height: 40,
              display: 'block',
              flexShrink: 0,
              filter: 'drop-shadow(0 3px 7px rgba(194,84,14,0.30))',
            }}
          />
          <Typography
            variant="h6"
            fontWeight={700}
            noWrap
            sx={{ display: { xs: 'none', sm: 'block' }, letterSpacing: '-0.01em' }}
          >
            SSPL Kitchen
          </Typography>
        </Stack>

        {/* desktop section rail */}
        <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
          {sections.map((s) => {
            const isActive = s.key === active.key;
            return (
              <Box
                key={s.key}
                component={RouterLink}
                to={s.to}
                sx={{
                  position: 'relative',
                  px: 1.5,
                  py: 2,
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: isActive ? 'text.primary' : 'text.secondary',
                  transition: 'color .15s',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {s.label}
                {isActive && (
                  <Box
                    component={motion.div}
                    layoutId="section-rail"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 34 }}
                    sx={{
                      position: 'absolute',
                      left: 8,
                      right: 8,
                      bottom: 6,
                      height: 3,
                      borderRadius: 3,
                      bgcolor: 'primary.main',
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Stack>

        {/* mobile hamburger */}
        <IconButton sx={{ display: { md: 'none' }, mr: 'auto' }} onClick={() => setDrawer(true)}>
          <MenuIcon />
        </IconButton>

        {/* right cluster */}
        <ThemeToggle />
        {user && (
          <Chip
            size="small"
            label={`${user.full_name} · ${user.role}`}
            sx={{ ml: 1, display: { xs: 'none', sm: 'flex' }, fontWeight: 600 }}
            variant="outlined"
          />
        )}
        <IconButton onClick={logout} title="Log out" sx={{ ml: 0.5 }}>
          <LogoutIcon />
        </IconButton>
      </Toolbar>

      {/* mobile drawer: sections + their screens */}
      <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)}>
        <Box sx={{ width: 268 }} role="navigation" onClick={() => setDrawer(false)}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
            <Box
              component="img"
              src={logo}
              alt="SSPL Kitchen"
              sx={{
                width: 36,
                height: 36,
                display: 'block',
                flexShrink: 0,
                filter: 'drop-shadow(0 3px 6px rgba(194,84,14,0.28))',
              }}
            />
            <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
              SSPL Kitchen
            </Typography>
          </Stack>
          <Divider />
          {sections.map((s) => {
            const tabs = s.tabs.filter((t) => !t.roles || hasRole(...t.roles));
            const items = tabs.length ? tabs : [{ label: s.label, to: s.to }];
            return (
              <List
                key={s.key}
                dense
                subheader={
                  <ListSubheader disableSticky sx={{ bgcolor: 'transparent', fontWeight: 700, letterSpacing: 0.6 }}>
                    {s.label.toUpperCase()}
                  </ListSubheader>
                }
              >
                {items.map((t) => (
                  <ListItemButton
                    key={t.to}
                    component={RouterLink}
                    to={t.to}
                    selected={location.pathname === t.to}
                    sx={{ borderRadius: 2, mx: 1 }}
                  >
                    <ListItemText primary={t.label} />
                  </ListItemButton>
                ))}
              </List>
            );
          })}
        </Box>
      </Drawer>
    </AppBar>
  );
}
