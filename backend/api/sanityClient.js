const { createClient } = require('@sanity/client');

let sanityClient = null;

function getSanityClient() {
  if (sanityClient) return sanityClient;
  const projectId = process.env.SANITY_PROJECT_ID;
  if (!projectId) {
    console.warn('SANITY_PROJECT_ID not set — Sanity client unavailable.');
    return null;
  }
  const dataset = process.env.SANITY_DATASET || 'localeffort';
  sanityClient = createClient({
    projectId,
    dataset,
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
    apiVersion: '2024-01-01',
  });
  return sanityClient;
}

module.exports = { getSanityClient };
