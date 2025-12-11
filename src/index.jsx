import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { inject } from '@vercel/analytics';
// Sentry (frontend)
import * as Sentry from '@sentry/react';
import './styles/semantic-ui.css';

// Initialize Sentry only if DSN provided (avoid noisy console in local dev)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENV || import.meta.env.MODE || import.meta.env.NODE_ENV || 'development',
    // v8: default integrations include browser tracing when performance enabled by tracesSampleRate
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    replaysSessionSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || 0.0),
    replaysOnErrorSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAYS_ERROR_SAMPLE_RATE || 1.0),
    enableTracing: true,
  });
}

// Inject Vercel Analytics
inject();

const root = ReactDOM.createRoot(document.getElementById('root'));
const RootApp = import.meta.env.VITE_SENTRY_DSN ? Sentry.withProfiler(App) : App;
root.render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);

// Optional: Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
