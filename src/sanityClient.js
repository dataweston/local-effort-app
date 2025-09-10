// src/sanityClient.js
import { createClient } from '@sanity/client';

// Resolve environment values with multiple fallbacks:
// 1. Vite's import.meta.env at build-time (browser)
// 2. `window.__SANITY_CONFIG__` injected at runtime (optional)
// 3. Node's process.env (for scripts/tests)
const rawBuildEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
const runtimeWindowEnv = (typeof window !== 'undefined' && window.__SANITY_CONFIG__) ? window.__SANITY_CONFIG__ : {};
const nodeEnv = (typeof process !== 'undefined' && process.env) ? process.env : {};
const env = { ...nodeEnv, ...rawBuildEnv, ...runtimeWindowEnv } || {};

const projectId = env.VITE_APP_SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || env.SANITY_PROJECT_ID || env.PROJECT_ID;
const dataset = env.VITE_APP_SANITY_DATASET || env.VITE_SANITY_DATASET || env.SANITY_DATASET || env.DATASET;

let client = null;
try {
  if (projectId && dataset) {
    client = createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' });
  } else {
    // No env — export a stub to avoid crashing during import
    client = {
      fetch: async () => {
        throw new Error('Sanity client unavailable');
      },
    };
  }
} catch (e) {
  console.warn('Failed to initialize Sanity client:', e && (e.message || e));
  client = {
    fetch: async () => {
      throw new Error('Sanity client unavailable');
    },
  };
}

export default client;
