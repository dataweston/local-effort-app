import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';
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

type FirestoreLike = FirebaseFirestore.Firestore;

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

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function verifySquareSignature(rawBody: Buffer, signature: string): boolean {
  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  if (!sigKey || !notificationUrl) {
    console.error('[square.webhook] missing signature configuration');
    return false;
  }
  const hmac = crypto.createHmac('sha256', sigKey);
  hmac.update(notificationUrl + rawBody.toString('utf8'));
  const digest = hmac.digest('base64');
  const provided = Buffer.from(signature);
  const expected = Buffer.from(digest);
  return timingSafeEqual(provided, expected);
}

function parsePizzaQuantity(payment: PaymentObject): number {
  const items = payment.order?.line_items ?? [];
  return items
    .filter((item) => {
      const name = item.name ?? '';
      const catalogId = item.catalog_object_id ?? '';
      return /pizza/i.test(name) || /pizza/i.test(catalogId);
    })
    .reduce((sum, item) => {
      const quantityRaw = item.quantity;
      const quantity = typeof quantityRaw === 'string' ? Number(quantityRaw) : Number(quantityRaw ?? 0);
      return sum + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);
}

export async function applyCompletedPayment(payment: PaymentObject, options: { db?: FirestoreLike } = {}): Promise<void> {
  const firestore = options.db ?? defaultDb;
  if (!firestore) {
    throw new Error('Firestore unavailable');
  }

  const paymentId = payment.id;
  const customerId = payment.customer_id ?? null;
  const qty = parsePizzaQuantity(payment);
  const amount = Number(payment.amount_money?.amount ?? 0);

  await firestore.runTransaction(async (tx) => {
    const ordersRef = firestore.collection('orders').doc(paymentId);
    const existingOrder = await tx.get(ordersRef);
    if (existingOrder.exists) {
      return;
    }

    tx.set(ordersRef, {
      createdAt: new Date(),
      squarePaymentId: paymentId,
      customerId,
      item: 'pizza',
      qty,
      amount,
      status: 'PAID',
      source: 'square',
    });

    let backerIncrement = 0;
    if (customerId) {
      const backerRef = firestore.collection('backers').doc(customerId);
      const backerSnap = await tx.get(backerRef);
      if (!backerSnap.exists) {
        backerIncrement = 1;
        tx.set(backerRef, {
          firstSeenAt: new Date(),
          ordersCount: 1,
          amountTotal: amount,
        });
      } else {
        const data = backerSnap.data() ?? {};
        tx.update(backerRef, {
          ordersCount: Number(data.ordersCount ?? 0) + 1,
          amountTotal: Number(data.amountTotal ?? 0) + amount,
        });
      }
    }

    const aggRef = firestore.collection('aggregates').doc('crowdfunding');
    const aggSnap = await tx.get(aggRef);
    const base = aggSnap.exists ? aggSnap.data() ?? {} : {};
    const nextPizzas = Number(base.pizzas ?? 0) + qty;
    const nextBackers = Number(base.backers ?? 0) + backerIncrement;
    tx.set(
      aggRef,
      {
        pizzas: nextPizzas,
        backers: nextBackers,
        updatedAt: new Date(),
      },
      { merge: true },
    );
  });

  console.info('[square.webhook] processed payment', {
    id: paymentId,
    customerId,
    qty,
    amount,
  });
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

    await applyCompletedPayment(payment);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[square.webhook] handler error', error);
    res.status(500).json({ ok: false, error: 'internal-error' });
  }
}
