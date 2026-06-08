import axios from 'axios';

// Three resolution paths:
//   1. Explicit VITE_API_BASE_URL (used in dev & prod) wins.
//   2. Otherwise derive from BASE_URL (e.g. /mess/ -> /mess/api).
//   3. Fall back to /api for plain root deployments.
const explicit = import.meta.env.VITE_API_BASE_URL;
const baseFromMount = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/api';
const baseURL = explicit && explicit.length > 0 ? explicit : baseFromMount || '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('token');
      const loginUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/login' || '/login';
      if (!window.location.pathname.endsWith('/login')) {
        window.location.assign(loginUrl);
      }
    }
    return Promise.reject(err);
  },
);
