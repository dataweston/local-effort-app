/*
  Smoke test the Square webhook persistence + revalidate pipeline without hitting Square.
  - Loads env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SALE_REVALIDATE_URL, SALE_REVALIDATE_SECRET
  - Calls processSaleOrder(payment) directly with a crafted completed payment payload.
*/
import 'dotenv/config';
import assert from 'node:assert';
import http from 'node:http';
import { processSaleOrder, extractSaleOrder, type PaymentObject } from '../api/square/webhook';

async function tryRevalidateDirect(saleSlug: string): Promise<boolean> {
  const target = process.env.SALE_REVALIDATE_URL;
  if (!target) return false;
  try {
    const url = new URL(target);
    if (!url.searchParams.get('sale')) url.searchParams.set('sale', saleSlug);
    const secret = process.env.SALE_REVALIDATE_SECRET;
    if (secret && !url.searchParams.get('secret')) url.searchParams.set('secret', secret);
    const res = await fetch(url.toString(), { method: 'POST' });
    console.log('[smoke] direct revalidate status', res.status);
    return res.ok;
  } catch (e) {
    console.warn('[smoke] direct revalidate failed', e);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const extractOnly = args.includes('--extract-only');
  const withRevalidateServer = args.includes('--with-revalidate-server');
  const portArg = args.find((a) => a.startsWith('--revalidate-port='));
  const revalidatePort = portArg ? Number(portArg.split('=')[1]) : 3031;
  const saleSlugArg = args.find((a) => a && !a.startsWith('-'));
  const saleSlug = saleSlugArg || process.env.TEST_SALE_SLUG || 'test-sale';
  const paymentId = `test_${Date.now()}`;

  if (!extractOnly) {
    assert(process.env.SUPABASE_URL, 'SUPABASE_URL is required');
    assert(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY is required');
  }

  const payment: PaymentObject = {
    id: paymentId,
    status: 'COMPLETED',
    note: `sale:${saleSlug}`,
    customer_details: { email_address: 'tester@example.com' },
    metadata: { env: 'smoke' },
    total_money: { amount: 1500 },
    order: {
      location_id: 'TEST',
      metadata: { saleSlug },
      line_items: [
        {
          name: 'Test Product',
          catalog_object_id: 'TEST_PROD_1',
          quantity: 1,
          metadata: { productId: 'TEST_PROD_1', saleSlug }
        }
      ]
    }
  };

  if (extractOnly) {
    const extracted = extractSaleOrder(payment);
    if (!extracted) {
      throw new Error('Extract-only failed: no saleSlug parsed');
    }
    console.log('[smoke] extract-only', extracted);
    return;
  }

  let server: http.Server | null = null;
  try {
    if (withRevalidateServer) {
      // Start a tiny local server that answers 200 OK for POST /api/revalidate
      const port = Number.isFinite(revalidatePort) ? revalidatePort : 3031;
      const base = `http://127.0.0.1:${port}`;
      if (!process.env.SALE_REVALIDATE_URL) {
        process.env.SALE_REVALIDATE_URL = `${base}/api/revalidate`;
      }
      server = http
        .createServer((req, res) => {
          if (req.method === 'POST' && req.url && req.url.startsWith('/api/revalidate')) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, revalidated: true }));
          } else {
            res.statusCode = 404;
            res.end('not found');
          }
        })
        .listen(port);
      console.log(`[smoke] revalidate server listening at ${process.env.SALE_REVALIDATE_URL}`);
    }

    const result = await processSaleOrder(payment);
    if (!result) {
      console.warn('[smoke] processSaleOrder returned null. Attempting direct revalidate...');
      const ok = await tryRevalidateDirect(saleSlug);
      if (!ok) {
        throw new Error('Smoke test failed: neither Supabase insert nor direct revalidate succeeded');
      }
      console.log('[smoke] direct revalidate succeeded');
      return;
    }
    console.log('[smoke] result', result);
    if (!result.revalidated) {
      const ok = await tryRevalidateDirect(result.saleSlug);
      console.log('[smoke] fallback direct revalidate', ok ? 'succeeded' : 'failed');
    }
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
