'use server';

import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';

import { getSanityClient, hasSanityConfig } from './sanity.server';

const SALE_BY_SLUG_QUERY = `
  *[_type == "sale" && slug.current == $slug][0]{
    _id,
    title,
    slug,
    layoutVariant,
    hero {
      eyebrow,
      heading,
      subheading,
      body,
      image { asset->{ url } }
    },
    tagline,
    pickupWindow {
      timezone,
      start,
      end,
      instructions,
      locationName,
      addressLines
    },
    theme {
      backgroundColor,
      foregroundColor,
      surfaceColor,
      borderColor,
      accentColor,
      mutedColor,
      cardStyle,
      buttonVariant,
      heroVariant
    },
    tracking {
      metaPixelId,
      gtagId,
      utmSource
    },
    email {
      brevoTemplateId,
      senderName
    },
    faqs[] {
      question,
      answer
    },
    stats {
      soldCount
    },
    square {
      locationId,
      checkoutMode,
      webhookTag
    },
    meta {
      title,
      description,
      ogImage { asset->{ url } }
    },
    seo {
      title,
      description,
      ogImage { asset->{ url } }
    },
    products[] {
      _key,
      order,
      badge,
      hide,
      limitPerCustomer,
      priceOverride,
      notes,
      product -> {
        _id,
        title,
        slug,
        shortDescription,
        longDescription,
        images[]{ asset->{ url } },
        price,
        salePrice,
        priceDisplay,
        squareItemId,
        squareVariationId,
        squareCheckoutLinkUrl,
        inventoryMode,
        manualQty
      }
    }
  }
`;

const SALE_SLUGS_QUERY = `*[_type == "sale" && defined(slug.current)].slug.current`;

const DEFAULT_THEME = {
  backgroundColor: '#0f172a',
  foregroundColor: '#f8fafc',
  surfaceColor: 'rgba(148, 163, 184, 0.06)',
  borderColor: 'rgba(148, 163, 184, 0.18)',
  mutedColor: 'rgba(148, 163, 184, 0.75)',
  accentColor: '#f97316',
  cardStyle: 'solid' as const,
  buttonVariant: 'solid' as const
};

export type SaleLayoutVariant = 'standard' | 'paikka';
export type SaleCheckoutMode = 'link' | 'inline';

export type NormalizedSaleProduct = {
  key: string;
  productId: string;
  productSlug?: string | null;
  title: string;
  shortDescription?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  priceCents: number;
  priceDisplay?: string | null;
  checkoutUrl?: string | null;
  squareItemId?: string | null;
  squareVariationId?: string | null;
  limitPerCustomer?: number | null;
  inventoryMode: 'square' | 'manual' | 'unmanaged';
  manualInventory?: number | null;
};

export type NormalizedSale = {
  id: string;
  slug: string;
  title: string;
  layoutVariant: SaleLayoutVariant;
  tagline?: string | null;
  hero?: {
    eyebrow?: string | null;
    heading?: string | null;
    subheading?: string | null;
    body?: string | null;
    imageUrl?: string | null;
  };
  pickupWindow?: {
    timezone?: string | null;
    start?: string | null;
    end?: string | null;
    instructions?: string | null;
    locationName?: string | null;
    addressLines?: string[];
  };
  theme: {
    backgroundColor?: string | null;
    foregroundColor?: string | null;
    surfaceColor?: string | null;
    borderColor?: string | null;
    mutedColor?: string | null;
    accentColor?: string | null;
    cardStyle?: string | null;
    buttonVariant?: string | null;
    heroVariant?: string | null;
  };
  products: NormalizedSaleProduct[];
  tracking?: {
    metaPixelId?: string | null;
    gtagId?: string | null;
    utmSource?: string | null;
  };
  email?: {
    brevoTemplateId?: string | null;
    senderName?: string | null;
  };
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  stats?: {
    soldCount?: number | null;
  };
  square?: {
    locationId?: string | null;
    checkoutMode?: SaleCheckoutMode | null;
    webhookTag?: string | null;
  };
  meta?: {
    title?: string | null;
    description?: string | null;
    ogImageUrl?: string | null;
  };
};

type RawSale = Record<string, any>;
type RawSaleProduct = Record<string, any> & { product?: Record<string, any> | null };

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeProduct(entry: RawSaleProduct): { product: NormalizedSaleProduct; order: number } | null {
  const product = entry?.product ?? null;
  const productId = safeString(product?._id) ?? undefined;
  if (!productId) {
    return null;
  }

  const hidden = Boolean(entry?.hide);
  if (hidden) {
    return null;
  }

  const orderRaw = safeNumber(entry?.order);
  const order = orderRaw ?? 0;

  const title = safeString(product?.title) ?? 'Untitled Product';
  const shortDescription = safeString(product?.shortDescription);
  const priceOverride = safeNumber(entry?.priceOverride);
  const price = safeNumber(product?.salePrice) ?? safeNumber(product?.price) ?? 0;
  const priceCents = Math.max(0, Math.round(priceOverride ?? price ?? 0));

  const priceDisplay = safeString(product?.priceDisplay);
  const checkoutUrl = safeString(product?.squareCheckoutLinkUrl);
  const imageArray = Array.isArray(product?.images)
    ? (product?.images as Array<{ asset?: { url?: unknown } | null }>)
    : [];
  const firstImage = imageArray.find((img) => safeString(img?.asset?.url));
  const imageUrl = firstImage ? safeString(firstImage.asset?.url) : null;

  const inventoryModeRaw = safeString(product?.inventoryMode);
  let inventoryMode: 'square' | 'manual' | 'unmanaged' = 'unmanaged';
  if (inventoryModeRaw === 'square') {
    inventoryMode = 'square';
  } else if (inventoryModeRaw === 'manual') {
    inventoryMode = 'manual';
  }

  const manualInventory = inventoryMode === 'manual' ? safeNumber(product?.manualQty) : null;

  return {
    order,
    product: {
      key: safeString(entry?._key) ?? productId,
      productId,
      productSlug: safeString(product?.slug?.current),
      title,
      shortDescription,
      notes: safeString(entry?.notes),
      imageUrl,
      badge: safeString(entry?.badge),
      priceCents,
      priceDisplay,
      checkoutUrl,
      squareItemId: safeString(product?.squareItemId) ?? undefined,
      squareVariationId: safeString(product?.squareVariationId) ?? undefined,
      limitPerCustomer: safeNumber(entry?.limitPerCustomer),
      inventoryMode,
      manualInventory: manualInventory ?? undefined
    }
  };
}

function normalizeSale(raw: RawSale): NormalizedSale | null {
  const id = safeString(raw?._id);
  const slug = safeString(raw?.slug?.current ?? raw?.slug);
  const title = safeString(raw?.title) ?? undefined;
  if (!id || !slug || !title) {
    return null;
  }

  const normalizedProducts = (Array.isArray(raw?.products) ? (raw.products as RawSaleProduct[]) : [])
    .map((entry) => normalizeProduct(entry))
    .filter((value): value is { product: NormalizedSaleProduct; order: number } => Boolean(value))
    .sort((a, b) => a.order - b.order)
    .map(({ product }) => product);

  const heroImage = safeString(raw?.hero?.image?.asset?.url ?? raw?.meta?.ogImage?.asset?.url ?? raw?.seo?.ogImage?.asset?.url);

  const theme = {
    backgroundColor: safeString(raw?.theme?.backgroundColor) ?? DEFAULT_THEME.backgroundColor,
    foregroundColor: safeString(raw?.theme?.foregroundColor) ?? DEFAULT_THEME.foregroundColor,
    surfaceColor: safeString(raw?.theme?.surfaceColor) ?? DEFAULT_THEME.surfaceColor,
    borderColor: safeString(raw?.theme?.borderColor) ?? DEFAULT_THEME.borderColor,
    mutedColor: safeString(raw?.theme?.mutedColor) ?? DEFAULT_THEME.mutedColor,
    accentColor: safeString(raw?.theme?.accentColor) ?? DEFAULT_THEME.accentColor,
    cardStyle: safeString(raw?.theme?.cardStyle) ?? DEFAULT_THEME.cardStyle,
    buttonVariant: safeString(raw?.theme?.buttonVariant) ?? DEFAULT_THEME.buttonVariant,
    heroVariant: safeString(raw?.theme?.heroVariant)
  };

  const meta = {
    title: safeString(raw?.meta?.title ?? raw?.seo?.title),
    description: safeString(raw?.meta?.description ?? raw?.seo?.description),
    ogImageUrl: heroImage ?? safeString(raw?.meta?.ogImage?.asset?.url ?? raw?.seo?.ogImage?.asset?.url)
  };

  const layoutVariant = safeString(raw?.layoutVariant) === 'paikka' ? 'paikka' : 'standard';

  const faqs = Array.isArray(raw?.faqs)
    ? (raw.faqs as Array<{ question?: unknown; answer?: unknown }>)
        .map((entry) => {
          const question = safeString(entry?.question);
          const answer = safeString(entry?.answer);
          if (!question || !answer) {
            return null;
          }
          return { question, answer };
        })
        .filter((value): value is { question: string; answer: string } => Boolean(value))
    : [];

  return {
    id,
    slug,
    title,
    layoutVariant,
    tagline: safeString(raw?.tagline),
    hero: {
      eyebrow: safeString(raw?.hero?.eyebrow),
      heading: safeString(raw?.hero?.heading) ?? title,
      subheading: safeString(raw?.hero?.subheading ?? raw?.tagline),
      body: safeString(raw?.hero?.body),
      imageUrl: heroImage
    },
    pickupWindow: {
      timezone: safeString(raw?.pickupWindow?.timezone),
      start: safeString(raw?.pickupWindow?.start),
      end: safeString(raw?.pickupWindow?.end),
      instructions: safeString(raw?.pickupWindow?.instructions),
      locationName: safeString(raw?.pickupWindow?.locationName),
      addressLines: Array.isArray(raw?.pickupWindow?.addressLines)
        ? (raw.pickupWindow.addressLines as unknown[])
            .map((line) => safeString(line))
            .filter((line): line is string => Boolean(line))
        : undefined
    },
    theme,
    products: normalizedProducts,
    faqs: faqs.length > 0 ? faqs : undefined,
    tracking: {
      metaPixelId: safeString(raw?.tracking?.metaPixelId),
      gtagId: safeString(raw?.tracking?.gtagId),
      utmSource: safeString(raw?.tracking?.utmSource)
    },
    email: {
      brevoTemplateId: safeString(raw?.email?.brevoTemplateId),
      senderName: safeString(raw?.email?.senderName)
    },
    stats: {
      soldCount: safeNumber(raw?.stats?.soldCount)
    },
    square: {
      locationId: safeString(raw?.square?.locationId),
      checkoutMode: ((): SaleCheckoutMode | null => {
        const mode = safeString(raw?.square?.checkoutMode);
        return mode === 'inline' ? 'inline' : mode === 'link' ? 'link' : null;
      })(),
      webhookTag: safeString(raw?.square?.webhookTag)
    },
    meta
  };
}

const cachedSaleBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      try {
        const client = getSanityClient();
        const raw = await client.fetch<RawSale | null>(SALE_BY_SLUG_QUERY, { slug });
        if (!raw) return null;
        return normalizeSale(raw);
      } catch (error) {
        console.error('[sales] failed to fetch sale', { slug, error });
        return null;
      }
    },
    ['sale-by-slug', slug],
    { tags: [`sale:${slug}`], revalidate: 60 }
  )();

const cachedSaleSlugs = unstable_cache(
  async () => {
    try {
      const client = getSanityClient();
      const slugs = await client.fetch<string[] | null>(SALE_SLUGS_QUERY);
      return Array.isArray(slugs) ? slugs.filter((slug): slug is string => typeof slug === 'string') : [];
    } catch (error) {
      console.error('[sales] failed to fetch slugs', error);
      return [];
    }
  },
  ['sale-slugs'],
  { tags: ['sale:slugs'], revalidate: 300 }
);

export async function fetchSaleSlugs(): Promise<string[]> {
  if (!hasSanityConfig()) {
    return [];
  }
  return cachedSaleSlugs();
}

export async function fetchSaleBySlug(slug: string): Promise<NormalizedSale | null> {
  if (!hasSanityConfig() || !slug) {
    return null;
  }
  return cachedSaleBySlug(slug);
}

export function buildSaleMetadata(sale: NormalizedSale | null, slug: string): Metadata {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://localeffortfood.com').replace(/\/$/, '');
  const canonical = `${baseUrl}/${slug}`;

  const title = sale?.meta?.title ?? `${sale?.title ?? 'Local Effort Sale'} | Local Effort`;
  const description = sale?.meta?.description ?? sale?.tagline ?? 'Local Effort presale event';
  const images = sale?.meta?.ogImageUrl ? [sale.meta.ogImageUrl] : sale?.hero?.imageUrl ? [sale.hero.imageUrl] : undefined;

  return {
    title,
    description: description ?? undefined,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: 'Local Effort',
      title,
      description: description ?? undefined,
      images: images?.map((url) => ({ url }))
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description ?? undefined,
      images
    }
  } satisfies Metadata;
}
