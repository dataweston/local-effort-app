import type { NormalizedSale } from '../../lib/sales';

function buildProductsSchema(sale: NormalizedSale) {
  if (!Array.isArray(sale.products) || sale.products.length === 0) {
    return null;
  }

  const elements = sale.products.map((product, index) => {
    const sku = product.squareVariationId ?? product.squareItemId ?? product.productId;
    const availability = typeof product.manualInventory === 'number' && product.manualInventory <= 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';

    return {
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.title,
        description: product.shortDescription ?? undefined,
        sku: sku ?? undefined,
        image: product.imageUrl ? [product.imageUrl] : undefined,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: Number.isFinite(product.priceCents) ? (product.priceCents / 100).toFixed(2) : undefined,
          availability,
          url: product.checkoutUrl ?? undefined
        }
      }
    };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: sale.title,
    description: sale.tagline ?? undefined,
    itemListElement: elements
  };
}

function buildEventSchema(sale: NormalizedSale) {
  const pickup = sale.pickupWindow;
  if (!pickup?.start && !pickup?.end) {
    return null;
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://localeffortfood.com').replace(/\/$/, '');
  const canonical = `${baseUrl}/${sale.slug}`;

  const addressLines = Array.isArray(pickup?.addressLines) ? pickup.addressLines.filter(Boolean) : [];

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: sale.title,
    startDate: pickup?.start ?? undefined,
    endDate: pickup?.end ?? undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    location:
      pickup?.locationName || addressLines.length > 0
        ? {
            '@type': 'Place',
            name: pickup?.locationName ?? undefined,
            address:
              addressLines.length > 0
                ? {
                    '@type': 'PostalAddress',
                    streetAddress: addressLines.join(', ')
                  }
                : undefined
          }
        : undefined,
    url: canonical
  };
}

export function SaleStructuredData({ sale }: { sale: NormalizedSale }) {
  const schemas = [buildProductsSchema(sale), buildEventSchema(sale)].filter(Boolean);

  if (schemas.length === 0) {
    return null;
  }

  const payload = schemas.length === 1 ? schemas[0] : schemas;

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
