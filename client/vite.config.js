import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the API runs on :5000. Proxying keeps cookies same-origin, so login just works.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000' } },
});
