import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname is not available in ESM by default; derive it for path.resolve
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const r = (p) => path.resolve(__dirname, p).replace(/\\/g, '/');

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: '@partners/zafa', replacement: r('src/partners/zafa.jsx') },
      { find: '@partners/gallant', replacement: r('src/partners/gallant.jsx') },
      { find: '@partners/happymonday', replacement: r('src/partners/happymonday.jsx') },
    ],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});