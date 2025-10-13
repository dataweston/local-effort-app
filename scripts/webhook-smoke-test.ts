/*
  Smoke test the Square webhook persistence + revalidate pipeline without hitting Square.
  - Loads env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SALE_REVALIDATE_URL, SALE_REVALIDATE_SECRET
  - Calls processSaleOrder(payment) directly with a crafted completed payment payload.
*/
import 'dotenv/config';
import assert from 'node:assert';
import { processSaleOrder, extractSaleOrder, type PaymentObject } from '../api/square/webhook';

async function main() {
  const args = process.argv.slice(2);
  const extractOnly = args.includes('--extract-only');
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

  const result = await processSaleOrder(payment);
  if (!result) {
    throw new Error('Smoke test failed: processSaleOrder returned null (no saleSlug?)');
  }
  console.log('[smoke] result', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
