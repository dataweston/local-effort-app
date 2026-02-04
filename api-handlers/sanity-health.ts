import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSanityClient, hasSanityConfig } from './_lib/sanityClient';

const HEALTH_QUERY = '*[_type == "sanity.imageAsset"][0]{_id}';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');

  if (!hasSanityConfig()) {
    res.status(500).json({ ok: false, error: 'sanity-not-configured' });
    return;
  }

  try {
    const client = getSanityClient();
    const result = await client.fetch<Record<string, unknown>>(HEALTH_QUERY, {});
    res.status(200).json({ ok: true, result: result ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown-error';
    console.error('[api/sanity-health] fetch failed', message);
    res.status(500).json({ ok: false, error: 'sanity-fetch-failed' });
  }
}
