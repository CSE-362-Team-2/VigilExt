import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev server proxies /api/* to the Express API so the client can call
// relative paths in both dev (vite) and prod (Caddy strips /api).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
