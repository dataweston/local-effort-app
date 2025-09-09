// Optional runtime Sanity config. This file can be generated at deploy time
// to avoid requiring a rebuild when env vars change. Examples of generation:
// echo "window.__SANITY_CONFIG__={VITE_APP_SANITY_PROJECT_ID:'<id>',VITE_APP_SANITY_DATASET:'<dataset>'}" > public/runtime-sanity-config.js

if (typeof window !== 'undefined') {
  window.__SANITY_CONFIG__ = window.__SANITY_CONFIG__ || {};
  // Example placeholders; replace at deploy time
  window.__SANITY_CONFIG__.VITE_APP_SANITY_PROJECT_ID = window.__SANITY_CONFIG__.VITE_APP_SANITY_PROJECT_ID || '';
  window.__SANITY_CONFIG__.VITE_APP_SANITY_DATASET = window.__SANITY_CONFIG__.VITE_APP_SANITY_DATASET || '';
}
