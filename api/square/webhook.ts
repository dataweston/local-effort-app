import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { applyCompletedPayment, verifySquareSignature } from '../../packages/lib/crowdfundingPipeline';
import { db as defaultDb } from '../../packages/lib/firebaseAdmin';

type Req = IncomingMessage & {
  method?: string;
  headers: IncomingHttpHeaders;
  body?: unknown;
  rawBody?: Buffer | string;
};

type Res = ServerResponse & {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type PaymentObject = {
  id: string;
  status?: string;
  customer_id?: string | null;
  order?: {
    line_items?: Array<{
      name?: string | null;
      catalog_object_id?: string | null;
      quantity?: string | number | null;
    }>;
  };
  amount_money?: {
    amount?: number | string | null;
  };
};

export const config = { api: { bodyParser: false } };

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

async function readRawBody(req: Req): Promise<Buffer> {
  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody;
  }
  if (typeof req.rawBody === 'string') {
    return Buffer.from(req.rawBody);
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(request: Req, response: ServerResponse): Promise<void> {
  const req = request;
  const res = withHelpers(response);

  if (req.method && req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  try {
    const signatureHeader = req.headers['x-square-hmacsha256-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!signature) {
      res.status(400).json({ ok: false, error: 'missing-signature' });
      return;
    }

    const rawBody = await readRawBody(req);
    if (!verifySquareSignature(rawBody, signature)) {
      res.status(400).json({ ok: false, error: 'invalid-signature' });
      return;
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventType = payload?.type ?? payload?.event_type;
    if (!eventType || !String(eventType).includes('payment')) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const payment: PaymentObject | undefined = payload?.data?.object?.payment;
    if (!payment || !payment.id) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const status = (payment.status || '').toUpperCase();
    if (status !== 'COMPLETED') {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    await applyCompletedPayment(payment, { db: defaultDb });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[square.webhook] handler error', error);
    res.status(500).json({ ok: false, error: 'internal-error' });
  }
}
