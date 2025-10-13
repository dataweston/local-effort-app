import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

type RevalidatePayload = {
  sale?: string | null;
  secret?: string | null;
};

function normalizeSlug(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function normalizeSecret(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function readPayload(request: Request): Promise<RevalidatePayload | null> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }
  try {
    const json = await request.json();
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      return {
        sale: normalizeSlug((json as Record<string, unknown>).sale as string | undefined) ?? null,
        secret: normalizeSecret((json as Record<string, unknown>).secret as string | undefined)
      };
    }
  } catch (error) {
    console.warn('[revalidate] failed to parse JSON body', error);
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const configuredSecret = normalizeSecret(process.env.SALE_REVALIDATE_SECRET);
  const url = new URL(request.url);
  const querySale = normalizeSlug(url.searchParams.get('sale'));
  const querySecret = normalizeSecret(url.searchParams.get('secret'));

  const payload = await readPayload(request);
  const saleSlug = payload?.sale ?? querySale;
  const providedSecret = payload?.secret ?? querySecret;

  if (!saleSlug) {
    return NextResponse.json({ ok: false, error: 'missing-sale-slug' }, { status: 400 });
  }

  if (configuredSecret && configuredSecret !== providedSecret) {
    return NextResponse.json({ ok: false, error: 'invalid-secret' }, { status: 401 });
  }

  try {
    const tag = `sale:${saleSlug}`;
    revalidateTag(tag);
    return NextResponse.json({ ok: true, revalidated: true, tag }, { status: 200 });
  } catch (error) {
    console.error('[revalidate] failed to revalidate', { saleSlug, error });
    return NextResponse.json({ ok: false, error: 'revalidate-failed' }, { status: 500 });
  }
}

export function GET(): Response {
  return NextResponse.json({ ok: false, error: 'method-not-allowed' }, { status: 405 });
}
