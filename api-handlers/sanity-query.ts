import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSanityClient, hasSanityConfig } from './_lib/sanityClient';

type QueryPayload = {
  query?: string;
  params?: Record<string, unknown>;
};

function parseBody(req: VercelRequest): QueryPayload {
  if (req.body && typeof req.body === 'object') {
    return req.body as QueryPayload;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as QueryPayload;
    } catch (error) {
      throw new Error('invalid-json');
    }
  }

  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');

  if (!hasSanityConfig()) {
    res.status(500).json({ ok: false, error: 'sanity-not-configured' });
    return;
  }

  let body: QueryPayload;
  try {
    body = parseBody(req);
  } catch (error) {
    res.status(400).json({ ok: false, error: 'invalid-body' });
    return;
  }

  if (!body.query || typeof body.query !== 'string') {
    res.status(400).json({ ok: false, error: 'missing-query' });
    return;
  }

  const client = getSanityClient();
  try {
    const result = await client.fetch(body.query, body.params ?? {});
    res.status(200).json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown-error';
    console.error('[api/sanity-query] fetch failed', message);
    res.status(500).json({ ok: false, error: 'sanity-fetch-failed' });
  }
}
