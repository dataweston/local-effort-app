import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname is not available in ESM by default; derive it for path.resolve
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const r = (p) => path.resolve(__dirname, p).replace(/\\/g, '/');

// Determine whether to enable Sentry plugin (only when DSN + org + project present or when explicitly forced)
const enableSentry = !!process.env.VITE_SENTRY_DSN && !!process.env.SENTRY_ORG && !!process.env.SENTRY_PROJECT;
const release = process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || undefined;

export default defineConfig({
  plugins: [
    react(),
    enableSentry && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release,
      include: 'dist',
      urlPrefix: '~/dist',
      telemetry: false,
      setCommits: false,
      sourcemaps: { assets: './dist/**' }
    })
  ].filter(Boolean),
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: '@partners/zafa', replacement: r('src/partners/zafa.jsx') },
      { find: '@partners/gallant', replacement: r('src/partners/gallant.jsx') },
      { find: '@partners/happymonday', replacement: r('src/partners/happymonday.jsx') },
    ],
  },
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_'],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
