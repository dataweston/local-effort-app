import { createClient, type SanityClient } from '@sanity/client';

const DEFAULT_SANITY_PROJECT_ID = 'd6l9d0ea';
const DEFAULT_SANITY_DATASET = 'localeffort';

const projectId =
  process.env.SANITY_PROJECT_ID ||
  process.env.VITE_SANITY_PROJECT_ID ||
  process.env.VITE_APP_SANITY_PROJECT_ID ||
  DEFAULT_SANITY_PROJECT_ID;
const dataset =
  process.env.SANITY_DATASET ||
  process.env.VITE_SANITY_DATASET ||
  process.env.VITE_APP_SANITY_DATASET ||
  DEFAULT_SANITY_DATASET;
const apiVersion = process.env.SANITY_API_VERSION || '2023-05-03';
const token = process.env.SANITY_API_TOKEN || process.env.SANITY_WRITE_TOKEN;

let client: SanityClient | null = null;

if (projectId && dataset) {
  client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: token || undefined,
    useCdn: !token,
    perspective: token ? 'previewDrafts' : 'published',
  });
}

export function getSanityClient(): SanityClient {
  if (!client) {
    throw new Error('Sanity client unavailable');
  }
  return client;
}

export function hasSanityConfig(): boolean {
  return Boolean(projectId && dataset);
}
