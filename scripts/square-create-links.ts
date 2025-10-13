/*
  Square Checkout Links CLI (Tier A)
  - Usage:
    - Dry run (default): pnpm sale:links:dry --sale <slug>
    - Apply: pnpm sale:links --sale <slug>
  - Env required for apply:
    - SANITY_PROJECT_ID, SANITY_DATASET, SANITY_TOKEN (write) or SANITY_READ_TOKEN (read-only)
    - SQUARE_ACCESS_TOKEN, SQUARE_ENV=sandbox|production
    - Optional: DEFAULT_REDIRECT_URL
*/
import 'dotenv/config';
import crypto from 'node:crypto';
import assert from 'node:assert';
import { createClient as createSanityClient } from '@sanity/client';

// Square SDK (loaded lazily for dry-run safety)
let SquareClient: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SquareClient = require('square').Client;
} catch {
  // Keep null in dry-run mode
}

type CLIArgs = {
  sale?: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): CLIArgs {
  const args: CLIArgs = { dryRun: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;
    if (a === '--sale' && argv[i + 1]) {
      args.sale = String(argv[++i]).trim();
    } else if (a === '--apply' || a === '--no-dry-run') {
      args.dryRun = false;
    } else if (a === '--dry-run') {
      args.dryRun = true;
    }
  }
  return args;
}

function sanity() {
  const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || 'production';
  const token = process.env.SANITY_TOKEN || process.env.SANITY_WRITE_TOKEN || process.env.SANITY_READ_TOKEN || '';
  assert(projectId, 'SANITY_PROJECT_ID is required');
  return createSanityClient({ projectId, dataset, token, apiVersion: '2025-10-11', useCdn: false });
}

async function fetchSaleProducts(slug: string) {
  const client = sanity();
  const query = `*[_type == "sale" && slug.current == $slug][0]{
    slug,
    square{ locationId },
    products[]{
      _key,
      product->{
        _id, title, price, salePrice,
        squareItemId, squareVariationId, squareCheckoutLinkUrl
      }
    }
  }`;
  const sale = await client.fetch(query, { slug });
  if (!sale) return null;
  const locationId: string | null = sale?.square?.locationId || null;
  const products = Array.isArray(sale?.products) ? sale.products : [];
  const items = products
    .map((row: any) => {
      const p = row?.product;
      if (!p?._id) return null;
      return {
        id: p._id as string,
        title: String(p.title || 'Untitled'),
        variationId: p.squareVariationId as string | undefined,
        itemId: p.squareItemId as string | undefined,
        existingUrl: p.squareCheckoutLinkUrl as string | undefined,
        priceCents: Number.isFinite(p.salePrice) ? Math.round(p.salePrice) : Number.isFinite(p.price) ? Math.round(p.price) : undefined
      };
    })
    .filter(Boolean);
  return { slug, locationId, items } as { slug: string; locationId: string | null; items: Array<any> };
}

function squareClientOrNull() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const env = (process.env.SQUARE_ENV || 'sandbox').toLowerCase();
  if (!SquareClient || !accessToken) return null;
  return new SquareClient({
    environment: env === 'production' ? 'production' : 'sandbox',
    accessToken
  });
}

async function createPaymentLink(client: any, opts: {
  locationId: string;
  name: string;
  priceCents: number;
  saleSlug: string;
  productId: string;
}): Promise<{ url: string; id: string } | null> {
  const idempotencyKey = crypto.randomUUID();
  const redirectUrl = process.env.DEFAULT_REDIRECT_URL || 'https://localeffortfood.com/thank-you';
  // Using quickPay for simplicity; embed sale/product hints in paymentNote for webhook parsing.
  const body: any = {
    idempotencyKey,
    quickPay: {
      name: opts.name,
      priceMoney: { amount: opts.priceCents, currency: 'USD' },
      locationId: opts.locationId
    },
    checkoutOptions: {
      redirectUrl,
      paymentNote: `sale:${opts.saleSlug} product:${opts.productId}`
    }
  };
  try {
    const response = await client.checkoutApi.createPaymentLink(body as any);
    const link = response?.result?.paymentLink;
    if (link?.url && link?.id) {
      return { url: String(link.url), id: String(link.id) };
    }
    return null;
  } catch (err) {
    console.error('[links] createPaymentLink failed', err);
    return null;
  }
}

async function patchProductCheckoutUrl(productId: string, url: string) {
  const client = sanity();
  await client.patch(productId).set({ squareCheckoutLinkUrl: url }).commit({ autoGenerateArrayKeys: true });
}

async function run() {
  const { sale, dryRun } = parseArgs(process.argv.slice(2));
  if (!sale) throw new Error('Usage: --sale <slug> [--dry-run|--apply]');

  const saleData = await fetchSaleProducts(sale);
  if (!saleData) throw new Error(`Sale not found: ${sale}`);

  if (!saleData.locationId) {
    console.warn('[links] Missing Square locationId on sale; links will default to account default location');
  }

  const candidates = saleData.items.filter((i) => !i.existingUrl);
  if (!candidates.length) {
    console.log('[links] No products require links. Exiting.');
    return;
  }

  const client = squareClientOrNull();
  if (!client && !dryRun) {
    console.warn('[links] SQUARE_ACCESS_TOKEN not set; forcing dry-run');
  }

  const results: Array<{ productId: string; title: string; url?: string; created: boolean; error?: string }> = [];
  for (const p of candidates) {
    const title = p.title as string;
    const priceCents = Number.isFinite(p.priceCents) ? p.priceCents : 0;
    if (dryRun || !client) {
      results.push({ productId: p.id, title, created: false });
      continue;
    }
    const link = await createPaymentLink(client, {
      locationId: saleData.locationId || '',
      name: title,
      priceCents: priceCents || 0,
      saleSlug: saleData.slug,
      productId: p.id
    });
    if (link?.url) {
      try {
        await patchProductCheckoutUrl(p.id, link.url);
        results.push({ productId: p.id, title, url: link.url, created: true });
      } catch (e: any) {
        results.push({ productId: p.id, title, url: link.url, created: false, error: String(e?.message || e) });
      }
    } else {
      results.push({ productId: p.id, title, created: false, error: 'No link returned' });
    }
  }

  console.table(results);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
