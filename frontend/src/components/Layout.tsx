import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

import TopBar, { TOPBAR_H } from './TopBar';
import SectionTabs from './SectionTabs';

export default function Layout() {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <TopBar />
      <Box sx={{ pt: `${TOPBAR_H}px` }}>
        <SectionTabs />
        <Box
          component="main"
          sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2.5, md: 3.5 } }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
