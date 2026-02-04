/**
 * GET /api/feedback
 * Returns recent feedback from Supabase
 * POST /api/feedback
 * Saves new feedback to Supabase
 * 
 * ⚠️ IMPORTANT - USES SUPABASE (not Firebase)
 * This endpoint uses Supabase PostgreSQL
 * Database: public.crowdfund_feedback table
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getSupabase } = require('../../backend/api/supabaseClient');

type Req = IncomingMessage & { method?: string; body?: any; url?: string };
type Res = ServerResponse & {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const MAX_COMMENT_LENGTH = 2000;
const MAX_NAME_LENGTH = 200;

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

function resolveLimit(limitParam: string | null): number {
  let limit = Number(limitParam ?? 200);
  if (!Number.isFinite(limit) || limit <= 0) limit = 200;
  return Math.min(Math.max(Math.floor(limit), 1), 500);
}

export default async function handler(request: Req, response: ServerResponse): Promise<void> {
  const req = request;
  const res = withHelpers(response);

  if (!req.method) {
    res.status(400).json({ ok: false, error: 'invalid-request' });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error('[feedback] Supabase not configured');
    res.status(503).json({ ok: false, error: 'database-unavailable' });
    return;
  }

  // POST: Submit new feedback
  if (req.method === 'POST') {
    try {
      const body = req.body ?? {};
      const name = sanitizeString(body.name, MAX_NAME_LENGTH) || 'Anonymous';
      const comment = sanitizeString(body.comment, MAX_COMMENT_LENGTH);
      const rating = Number(body.rating);

      // Validation
      if (!comment) {
        res.status(400).json({ ok: false, error: 'missing-comment' });
        return;
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        res.status(400).json({ ok: false, error: 'invalid-rating' });
        return;
      }

      // Insert feedback into Supabase
      const { data, error } = await supabase
        .from('crowdfund_feedback')
        .insert({
          name,
          comment,
          rating,
        })
        .select()
        .single();

      if (error) {
        console.error('[feedback.post] Error inserting:', error.message);
        res.status(500).json({ ok: false, error: 'internal-error' });
        return;
      }

      res.status(200).json({ 
        ok: true, 
        id: data.id,
        feedback: {
          id: data.id,
          name: data.name,
          comment: data.comment,
          rating: data.rating,
          timestamp: data.created_at,
        }
      });
    } catch (error) {
      console.error('[feedback.post] failed to persist feedback', error);
      res.status(500).json({ ok: false, error: 'internal-error' });
    }
    return;
  }

  // GET: Fetch recent feedback
  if (req.method === 'GET') {
    try {
      let limitParam: string | null = null;
      try {
        if (req.url) {
          const url = new URL(req.url, 'http://localhost');
          limitParam = url.searchParams.get('limit');
        }
      } catch {
        // ignore URL parsing errors
      }

      const limit = resolveLimit(limitParam);

      const { data, error } = await supabase
        .from('crowdfund_feedback')
        .select('id, name, comment, rating, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[feedback.get] Error fetching:', error.message);
        res.status(500).json({ ok: false, error: 'internal-error' });
        return;
      }

      // Transform to expected format
      const items = (data || []).map((item: { id: string; name: string; comment: string; rating: number; created_at: string }) => ({
        id: item.id,
        name: item.name,
        comment: item.comment,
        rating: item.rating,
        createdAt: item.created_at,
      }));

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
