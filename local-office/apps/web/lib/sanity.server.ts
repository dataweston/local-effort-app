import { createClient, type SanityClient } from '@sanity/client';

const apiVersion = process.env.SANITY_API_VERSION ?? '2023-10-01';
const projectId = process.env.SANITY_PROJECT_ID ?? process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET ?? process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const token = process.env.SANITY_READ_TOKEN ?? process.env.SANITY_API_TOKEN ?? undefined;

let client: SanityClient | null = null;

export function getSanityClient(): SanityClient {
  if (!client) {
    if (!projectId || !dataset) {
      throw new Error('Sanity configuration is missing projectId or dataset.');
    }

    client = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: !token,
      token,
      perspective: token ? 'previewDrafts' : 'published'
    });
  }

  return client;
}

export function hasSanityConfig(): boolean {
  return Boolean(projectId && dataset);
}
