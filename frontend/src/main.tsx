import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';

// Vite injects BASE_URL from the `base` config (with trailing slash).
// React Router expects basename WITHOUT trailing slash, except for '/'.
const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter basename={baseUrl}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
