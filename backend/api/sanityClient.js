const { createClient } = require('@sanity/client');

let sanityClient = null;
let sanityReadClient = null;

function resolveConfig() {
  const projectId = process.env.SANITY_PROJECT_ID;
  if (!projectId) {
    console.warn('SANITY_PROJECT_ID not set - Sanity client unavailable.');
    return null;
  }
  const dataset = process.env.SANITY_DATASET || 'localeffort';
  return { projectId, dataset };
}

function getSanityClient() {
  if (sanityClient) return sanityClient;
  const config = resolveConfig();
  if (!config) return null;
  sanityClient = createClient({
    ...config,
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
    apiVersion: '2023-05-03',
  });
  console.log(`[sanity] Client initialized: project=${config.projectId}, dataset=${config.dataset}`);
  return sanityClient;
}

function getSanityReadClient() {
  if (sanityReadClient) return sanityReadClient;
  const config = resolveConfig();
  if (!config) return null;
  sanityReadClient = createClient({
    ...config,
    useCdn: true,
    apiVersion: '2023-05-03',
    perspective: 'published',
  });
  console.log(`[sanity] Public read client initialized: project=${config.projectId}, dataset=${config.dataset}`);
  return sanityReadClient;
}

module.exports = { getSanityClient, getSanityReadClient };
