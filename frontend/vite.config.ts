import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // base path is set at build time so static asset URLs include the mount
    // prefix (e.g. /mess/) when the app is hosted under a subpath.
    base: env.VITE_BASE_PATH || '/',
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 5180,
      host: true,
      // Bind-mounted source on Windows/Docker doesn't emit native fs events,
      // so poll for changes to keep HMR working in the container.
      watch: { usePolling: true, interval: 300 },
    },
    test: {
      environment: 'jsdom',
      globals: true,
    },
  };
});
