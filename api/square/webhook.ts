import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { applyCompletedPayment, verifySquareSignature as verifyLegacySquareSignature } from '../../packages/lib/crowdfundingPipeline';
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

type PaymentLineItem = {
  name?: string | null;
  catalog_object_id?: string | null;
  quantity?: string | number | null;
  metadata?: Record<string, unknown> | null;
};

export type PaymentObject = {
  id: string;
  status?: string;
  customer_id?: string | null;
  customer_details?: {
    email_address?: string | null;
  } | null;
  buyer_email_address?: string | null;
  receipt_email?: string | null;
  metadata?: Record<string, unknown> | null;
  note?: string | null;
  order?: {
    location_id?: string | null;
    metadata?: Record<string, unknown> | null;
    line_items?: PaymentLineItem[] | null;
  } | null;
  amount_money?: {
    amount?: number | string | null;
  } | null;
  total_money?: {
    amount?: number | string | null;
  } | null;
};

type ExtractedSaleOrder = {
  saleSlug: string;
  productId: string | null;
  qty: number;
  amountCents: number;
  customerEmail: string | null;
  paymentId: string;
  metadata: Record<string, unknown> | null;
};

type RecordedSaleOrder = ExtractedSaleOrder & {
  inserted: boolean;
};

type SaleOrderProcessResult = {
  saleSlug: string;
  qty: number;
  amountCents: number;
  inserted: boolean;
  revalidated: boolean;
};

type MinimalFetch = (input: string, init?: { method?: string }) => Promise<{ ok: boolean; status: number }>;

const fetchFn: MinimalFetch | null = typeof globalThis.fetch === 'function'
  ? (globalThis.fetch as unknown as MinimalFetch)
  : null;

let supabaseClient: SupabaseClient<any, 'sales', any> | null = null;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getSupabaseClient(): SupabaseClient<any, 'sales', any> {
  if (supabaseClient) {
    return supabaseClient;
  }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'sales',
    },
  });
  return supabaseClient;
}

function collectMetadataSources(payment: PaymentObject): Record<string, unknown>[] {
  const sources: Record<string, unknown>[] = [];
  if (isRecord(payment.metadata)) {
    sources.push(payment.metadata as Record<string, unknown>);
  }
  const orderMetadata = payment.order?.metadata;
  if (isRecord(orderMetadata)) {
    sources.push(orderMetadata as Record<string, unknown>);
  }
  for (const item of payment.order?.line_items ?? []) {
    if (isRecord(item?.metadata)) {
      sources.push(item.metadata as Record<string, unknown>);
    }
  }
  return sources;
}

function lookupString(sources: Record<string, unknown>[], keys: string[]): string | null {
  for (const source of sources) {
    for (const [key, rawValue] of Object.entries(source)) {
      const match = keys.find((candidate) => candidate.toLowerCase() === key.toLowerCase());
      if (!match) continue;
      if (typeof rawValue === 'string' && rawValue.trim()) {
        return rawValue.trim();
      }
      if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
        return String(rawValue);
      }
    }
  }
  return null;
}

function lookupNumber(sources: Record<string, unknown>[], keys: string[]): number | null {
  for (const source of sources) {
    for (const [key, rawValue] of Object.entries(source)) {
      const match = keys.find((candidate) => candidate.toLowerCase() === key.toLowerCase());
      if (!match) continue;
      const value = typeof rawValue === 'string' ? Number(rawValue) : Number(rawValue ?? NaN);
      if (Number.isFinite(value)) {
        return value;
      }
    }
  }
  return null;
}

function sumLineItemQuantities(items?: PaymentLineItem[] | null): number {
  if (!items?.length) {
    return 0;
  }
  return items.reduce((total, item) => {
    const raw = typeof item.quantity === 'string' ? Number(item.quantity) : Number(item.quantity ?? 0);
    return total + (Number.isFinite(raw) ? raw : 0);
  }, 0);
}

function extractSaleSlugFromNote(note: unknown): string | null {
  if (typeof note !== 'string') {
    return null;
  }
  const match = note.match(/sale[:=]\s*([a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

export function extractSaleOrder(payment: PaymentObject): ExtractedSaleOrder | null {
  const metadataSources = collectMetadataSources(payment);
  const saleSlug =
    lookupString(metadataSources, ['saleSlug', 'sale_slug', 'sale', 'slug']) ?? extractSaleSlugFromNote(payment.note);

  if (!saleSlug) {
    return null;
  }

  const productId =
    lookupString(metadataSources, ['productId', 'product_id', 'product', 'item', 'catalogId']) ??
    (payment.order?.line_items ?? [])
      .map((item) => (typeof item.catalog_object_id === 'string' ? item.catalog_object_id.trim() : ''))
      .find((value) => !!value) ??
    null;

  const quantityFromMeta = lookupNumber(metadataSources, ['quantity', 'qty', 'count']);
  const lineItemQuantity = sumLineItemQuantities(payment.order?.line_items);
  const qtyCandidate = typeof quantityFromMeta === 'number' ? quantityFromMeta : lineItemQuantity;
  const qty = Math.max(1, Math.round(Number.isFinite(qtyCandidate) && qtyCandidate > 0 ? qtyCandidate : 1));

  const amountRaw = payment.total_money?.amount ?? payment.amount_money?.amount ?? 0;
  const amountNumeric = typeof amountRaw === 'string' ? Number(amountRaw) : Number(amountRaw ?? 0);
  const amountCents = Number.isFinite(amountNumeric) && amountNumeric > 0 ? Math.round(amountNumeric) : 0;

  const emailCandidates = [
    payment.customer_details?.email_address,
    payment.buyer_email_address,
    payment.receipt_email,
  ];
  const customerEmail = emailCandidates
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find((value) => !!value) || null;

  const metadataPayload: Record<string, unknown> = {};
  if (isRecord(payment.metadata) && Object.keys(payment.metadata).length) {
    metadataPayload.payment = payment.metadata as Record<string, unknown>;
  }
  const orderMeta = payment.order?.metadata;
  if (isRecord(orderMeta) && Object.keys(orderMeta).length) {
    metadataPayload.order = orderMeta as Record<string, unknown>;
  }
  const lineItemsMeta = (payment.order?.line_items ?? [])
    .map((item, index) => {
      if (!isRecord(item?.metadata)) {
        return null;
      }
      const metadata = item.metadata as Record<string, unknown>;
      return Object.keys(metadata).length ? { index, metadata } : null;
    })
    .filter((entry): entry is { index: number; metadata: Record<string, unknown> } => entry !== null);
  if (lineItemsMeta.length) {
    metadataPayload.lineItems = lineItemsMeta;
  }

  return {
    saleSlug: saleSlug.toLowerCase(),
    productId,
    qty,
    amountCents,
    customerEmail,
    paymentId: payment.id,
    metadata: Object.keys(metadataPayload).length ? metadataPayload : null,
  };
}

async function insertSaleOrder(payment: PaymentObject): Promise<RecordedSaleOrder | null> {
  const extracted = extractSaleOrder(payment);
  if (!extracted) {
    return null;
  }

  const supabase = getSupabaseClient();
  const payload = {
    sale_slug: extracted.saleSlug,
    product_id: extracted.productId,
    qty: extracted.qty,
    amount_cents: extracted.amountCents,
    square_payment_id: extracted.paymentId,
    customer_email: extracted.customerEmail,
    metadata: extracted.metadata,
  };

  const response = await supabase.from('orders').insert(payload);
  if (response.error) {
    if (response.error.code === '23505') {
      console.info('[square.webhook] duplicate payment skipped', { paymentId: extracted.paymentId });
      return { ...extracted, inserted: false };
    }
    throw Object.assign(new Error('supabase-insert-failed'), { cause: response.error });
  }

  return { ...extracted, inserted: true };
}

async function triggerSaleRevalidate(saleSlug: string): Promise<boolean> {
  const target = process.env.SALE_REVALIDATE_URL;
  if (!target) {
    return false;
  }
  try {
    const url = new URL(target);
    if (!url.searchParams.get('sale')) {
      url.searchParams.set('sale', saleSlug);
    }
    const secret = process.env.SALE_REVALIDATE_SECRET;
    if (secret && !url.searchParams.get('secret')) {
      url.searchParams.set('secret', secret);
    }
    if (!fetchFn) {
      console.warn('[square.webhook] global fetch unavailable, skipping revalidate');
      return false;
    }
    const response = await fetchFn(url.toString(), { method: 'POST' });
    if (!response.ok) {
      console.warn('[square.webhook] sale revalidate failed', { saleSlug, status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[square.webhook] sale revalidate threw', { saleSlug, error });
    return false;
  }
}

export async function processSaleOrder(payment: PaymentObject): Promise<SaleOrderProcessResult | null> {
  try {
    const recorded = await insertSaleOrder(payment);
    if (!recorded) {
      return null;
    }
    const revalidated = await triggerSaleRevalidate(recorded.saleSlug);
    return {
      saleSlug: recorded.saleSlug,
      qty: recorded.qty,
      amountCents: recorded.amountCents,
      inserted: recorded.inserted,
      revalidated,
    };
  } catch (error) {
    console.error('[square.webhook] failed to persist sale order', { paymentId: payment.id, error });
    return null;
  }
}

export const config = { api: { bodyParser: false } };

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
    if (!verifyLegacySquareSignature(rawBody, signature)) {
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

    const saleResult = await processSaleOrder(payment);
    if (saleResult) {
      console.info('[square.webhook] sale order recorded', saleResult);
    }

    await applyCompletedPayment(payment, { db: defaultDb });
    await applyCompletedPayment(payment);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[square.webhook] handler error', error);
    res.status(500).json({ ok: false, error: 'internal-error' });
  }
}
