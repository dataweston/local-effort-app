// src/sanityClient.js
import { createClient } from '@sanity/client';

// Gather build-time env first (Vite)
const env = (typeof import.meta !== 'undefined' ? import.meta.env : {}) || {};
// Also allow runtime injection via `window.__SANITY_CONFIG__` for deployed builds
const runtime = typeof window !== 'undefined' ? window.__SANITY_CONFIG__ || window.__SANITY_CLIENT_CONFIG__ : null;

const projectIdFromEnv = env.VITE_APP_SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID;
const datasetFromEnv = env.VITE_APP_SANITY_DATASET || env.VITE_SANITY_DATASET;

const projectId = projectIdFromEnv || (runtime && runtime.projectId);
const dataset = datasetFromEnv || (runtime && runtime.dataset);

let client = null;
if (projectId && dataset) {
  try {
    client = createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' });
  } catch (e) {
    // Fallback stub with clear error
    // eslint-disable-next-line no-console
    console.warn('Failed to initialize Sanity client:', e && (e.message || e));
    client = {
      fetch: async () => {
        throw new Error('Sanity client unavailable: initialization failed');
      },
    };
  }
} else {
  // Export a stub that throws with a helpful message. This allows imports to succeed
  // (so SSR/build steps don't crash) while surfacing a clear runtime error in the browser.
  client = {
    fetch: async () => {
      throw new Error(
        'Sanity client unavailable: missing projectId/dataset. Provide VITE_SANITY_PROJECT_ID and VITE_SANITY_DATASET at build time, or set window.__SANITY_CONFIG__ = { projectId, dataset } before your app boots.'
      );
    },
  };
}

export default client;
