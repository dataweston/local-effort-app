import fetch from 'node-fetch';
import { applyCompletedPayment } from '../packages/lib/crowdfundingPipeline';
import { applyCompletedPayment } from '../api/square/webhook';
import { db } from '../packages/lib/firebaseAdmin';

const BASE_URL = process.env.SQUARE_ENV === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

async function listPayments(cursor?: string) {
  const url = new URL('/v2/payments', BASE_URL);
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }
  url.searchParams.set('sort_order', 'DESC');
  url.searchParams.set('limit', '100');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Square API error: ${res.status} ${text}`);
  }

  return res.json();
}

async function backfill() {
  if (!process.env.SQUARE_ACCESS_TOKEN) {
    throw new Error('SQUARE_ACCESS_TOKEN missing');
  }

  console.info('[backfillSquare] starting backfill');

  let cursor: string | undefined;
  let processed = 0;

  do {
    const batch = await listPayments(cursor);
    const payments = Array.isArray(batch?.payments) ? batch.payments : [];

    for (const payment of payments) {
      if (!payment || !payment.id) continue;
      const status = String(payment.status || '').toUpperCase();
      if (status !== 'COMPLETED') continue;
      await applyCompletedPayment(payment, { db });
      processed += 1;
    }

    cursor = batch?.cursor || undefined;
  } while (cursor);

  console.info('[backfillSquare] finished', { processed });
}

backfill().catch((error) => {
  console.error('[backfillSquare] failed', error);
  process.exitCode = 1;
});
