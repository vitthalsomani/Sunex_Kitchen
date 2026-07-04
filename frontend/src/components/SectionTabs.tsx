import { Box, Tab, Tabs } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { activeSection } from '../nav';
import { TOPBAR_H } from './TopBar';

/**
 * Sticky sub-tab row for the active section's screens. Sticks directly under the
 * fixed TopBar on scroll. Renders nothing when a section has a single screen.
 */
export default function SectionTabs() {
  const location = useLocation();
  const { hasRole } = useAuth();
  const section = activeSection(location.pathname);
  const tabs = section.tabs.filter((t) => !t.roles || hasRole(...t.roles));

  if (tabs.length <= 1) return null;

  const current =
    tabs.find((t) => location.pathname === t.to || location.pathname.startsWith(t.to + '/'))?.to ??
    false;

  return (
    <Box
      sx={{
        position: 'sticky',
        top: TOPBAR_H,
        zIndex: (t) => t.zIndex.appBar - 1,
        backgroundColor: 'background.default',
        borderBottom: (t) => `1px solid ${t.palette.divider}`,
        px: { xs: 1, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Tabs value={current} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          {tabs.map((t) => (
            <Tab key={t.to} label={t.label} value={t.to} component={RouterLink} to={t.to} />
          ))}
        </Tabs>
      </Box>
    </Box>
  );
}
