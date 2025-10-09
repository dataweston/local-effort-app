import type { IncomingMessage, ServerResponse } from 'node:http';
import { config } from 'dotenv';
import { getCrowdfundingSummary } from '../../packages/lib/crowdfundingPipeline';
import { db } from '../../packages/lib/firebaseAdmin';

// Load environment variables
config({ path: '../../.env' });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadPublishedCrowdfundingSummary } = require('../../packages/lib/crowdfundingFallbacks');

type Req = IncomingMessage & { method?: string };
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

  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  try {
    const data = await getCrowdfundingSummary({ db });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (error) {
    console.error('[crowdfunding.summary] failed to load aggregate', error);
    try {
      const fallback = await loadPublishedCrowdfundingSummary();
      if (fallback) {
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json(fallback);
        return;
      }
    } catch (fallbackError) {
      console.warn('[crowdfunding.summary] fallback load failed', fallbackError);
    }
    res.status(500).json({ ok: false, error: 'internal-error' });
  }
}
