// src/sanityClient.js
import { createClient } from '@sanity/client';

// Resolve environment values with multiple fallbacks for non-browser usage:
// 1. Vite's import.meta.env at build-time
// 2. `window.__SANITY_CONFIG__` injected at runtime (optional)
const rawBuildEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
const runtimeWindowEnv = (typeof window !== 'undefined' && window.__SANITY_CONFIG__) ? window.__SANITY_CONFIG__ : {};
const env = { ...rawBuildEnv, ...runtimeWindowEnv } || {};

const projectId = env.VITE_APP_SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || env.SANITY_PROJECT_ID || env.PROJECT_ID;
const dataset = env.VITE_APP_SANITY_DATASET || env.VITE_SANITY_DATASET || env.SANITY_DATASET || env.DATASET;

// Create a custom client wrapper that proxies requests through backend to avoid CORS.
const createProxyClient = () => {
  return {
    fetch: async (query, params = {}) => {
      try {
        const response = await fetch('/api/sanity-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, params }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'fetch-failed' }));
          throw new Error(error.message || error.error || 'Sanity query failed');
        }

        const data = await response.json();
        return data.result;
      } catch (err) {
        console.error('Sanity proxy fetch error:', err);
        throw err;
      }
    },
  };
};

let client = null;
try {
  // In the browser, use the backend proxy unconditionally. The proxy endpoint
  // owns Sanity configuration and avoids coupling app startup to runtime script
  // load order or public build-time env availability.
  if (typeof window !== 'undefined') {
    client = createProxyClient();
  } else if (projectId && dataset) {
    // In Node environment (SSR/tests), use direct client.
    client = createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' });
  } else {
    // No env - export a stub to avoid crashing during import.
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

export const groqFetch = async (query, params = {}) => {
  if (!client || typeof client.fetch !== 'function') {
    throw new Error('Sanity client unavailable');
  }
  return client.fetch(query, params);
};
