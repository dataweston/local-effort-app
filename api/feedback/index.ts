import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { createFeedback, listFeedback } from '../../packages/lib/crowdfundingPipeline';
import { db as defaultDb } from '../../packages/lib/firebaseAdmin';

type Req = IncomingMessage & { method?: string; body?: any; url?: string };
type Res = ServerResponse & {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function withHelpers(res: ServerResponse): Res {
  const enhanced = res as Res;
  enhanced.status = function status(code: number) {
    res.statusCode = code;
    return enhanced;
  };
  enhanced.json = function json(body: unknown) {
    const payload = JSON.stringify(body);
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(payload);
  };
  return enhanced;
}

export default async function handler(request: Req, response: ServerResponse): Promise<void> {
  const req = request;
  const res = withHelpers(response);

  if (!req.method) {
    res.status(400).json({ ok: false, error: 'invalid-request' });
    return;
  }

  if (req.method === 'POST') {
    try {
      const result = await createFeedback(req.body ?? {}, { db: defaultDb });
      res.status(200).json({ ok: true, id: result.id });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code?: string }).code;
        if (code === 'invalid-rating' || code === 'missing-comment') {
          res.status(400).json({ ok: false, error: code });
          return;
        }
      }
      console.error('[feedback.post] failed to persist feedback', error);
      res.status(500).json({ ok: false, error: 'internal-error' });
    }
    return;
  }

  if (req.method === 'GET') {
    try {
      const sinceParam = (() => {
        if (!req.url) return null;
        try {
          const url = new URL(req.url, 'http://localhost');
          return url.searchParams.get('since');
        } catch (error) {
          return null;
        }
      })();
      const limitParam = (() => {
        if (!req.url) return null;
        try {
          const url = new URL(req.url, 'http://localhost');
          return url.searchParams.get('limit');
        } catch (error) {
          return null;
        }
      })();

      const items = await listFeedback(
        {
          since: sinceParam ?? undefined,
          limit: limitParam ? Number(limitParam) : undefined,
        },
        { db: defaultDb },
      );
      res.status(200).json({ ok: true, items });
    } catch (error) {
      console.error('[feedback.get] failed to load feedback', error);
      res.status(500).json({ ok: false, error: 'internal-error' });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ ok: false, error: 'method-not-allowed' });
}
