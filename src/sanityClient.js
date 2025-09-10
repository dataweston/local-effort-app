// src/sanityClient.js
import { createClient } from '@sanity/client';

const env = (typeof import.meta !== 'undefined' ? import.meta.env : {}) || {};
const projectId = env.VITE_APP_SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID;
const dataset = env.VITE_APP_SANITY_DATASET || env.VITE_SANITY_DATASET;

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
