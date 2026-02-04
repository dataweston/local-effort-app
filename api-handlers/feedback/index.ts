import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { createFeedback, listFeedback } from '../../packages/lib/crowdfundingPipeline';
import { db as defaultDb } from '../../packages/lib/firebaseAdmin';
import { db } from '../../packages/lib/firebaseAdmin';

type Req = IncomingMessage & { method?: string; body?: any; url?: string };
type Res = ServerResponse & {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const MAX_COMMENT_LENGTH = 2000;

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

function sanitizeString(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\r/g, '').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, limit);
}

function parseJsonBody(req: Req): any {
  if (req.body !== undefined) {
    return req.body;
  }
  return undefined;
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
      const body = parseJsonBody(req) ?? {};
      const rating = Number(body.rating);
      const comment = sanitizeString(body.comment, MAX_COMMENT_LENGTH);
      const customerId = typeof body.customerId === 'string' && body.customerId.trim() ? body.customerId.trim() : null;
      const orderId = typeof body.orderId === 'string' && body.orderId.trim() ? body.orderId.trim() : null;

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        res.status(400).json({ ok: false, error: 'invalid-rating' });
        return;
      }

      if (!comment) {
        res.status(400).json({ ok: false, error: 'missing-comment' });
        return;
      }

      try {
        const ref = db.collection('feedback').doc();
        const doc = {
          rating,
          comment,
          customerId,
          orderId,
          createdAt: new Date(),
        };
        await ref.set(doc);
        res.status(200).json({ ok: true, id: ref.id });
      } catch (error) {
        console.error('[feedback.post] failed to persist feedback', error);
        res.status(500).json({ ok: false, error: 'internal-error' });
      }
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
