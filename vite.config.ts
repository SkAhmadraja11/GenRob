import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/GenRob/' : '/',
  server: {
    port: 5173,
    host: true,
  },
}));

