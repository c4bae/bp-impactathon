import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxies /api -> the Express server so the frontend calls same-origin paths.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
