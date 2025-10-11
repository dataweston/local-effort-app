import type { NormalizedSaleProduct, SaleCheckoutMode } from '../../lib/sales';
import type { SaleTheme } from './theme';

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
});

function formatPrice(cents: number): string {
  return USD_FORMATTER.format((cents ?? 0) / 100);
}

export function SaleProductCard({
  product,
  theme,
  checkoutMode
}: {
  product: NormalizedSaleProduct;
  theme: SaleTheme;
  checkoutMode: SaleCheckoutMode | null | undefined;
}) {
  const priceLabel = product.priceDisplay ?? formatPrice(product.priceCents);
  const manualInventory = product.inventoryMode === 'manual' ? product.manualInventory : null;
  const soldOut = typeof manualInventory === 'number' && manualInventory <= 0;
  const isInlineCheckout = checkoutMode === 'inline';
  const inlineDisabled = isInlineCheckout && !product.checkoutUrl; // placeholder until inline flow implemented

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl border shadow-lg"
      style={{
        backgroundColor: theme.cardStyle === 'frosted' ? 'rgba(255,255,255,0.75)' : theme.surface,
        borderColor: theme.border,
        color: theme.foreground
      }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl ?? 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80'}
          alt={product.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />
        {product.badge ? (
          <span
            className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow"
            style={{ backgroundColor: theme.accent }}
          >
            {product.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5 text-sm">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold leading-tight">{product.title}</h3>
          {product.shortDescription ? <p className="text-sm opacity-80">{product.shortDescription}</p> : null}
          <p className="text-base font-semibold" style={{ color: theme.accent }}>
            {priceLabel}
          </p>
        </div>

        {product.notes ? (
          <p className="text-xs" style={{ color: theme.muted }}>
            {product.notes}
          </p>
        ) : null}
        {typeof product.limitPerCustomer === 'number' && product.limitPerCustomer > 0 ? (
          <p className="text-xs" style={{ color: theme.muted }}>
            Limit {product.limitPerCustomer} per guest
          </p>
        ) : null}
        {typeof manualInventory === 'number' ? (
          <p className="text-xs" style={{ color: theme.muted }}>
            {manualInventory > 0 ? `${manualInventory} remaining` : 'Currently sold out'}
          </p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2">
          {!soldOut && product.checkoutUrl ? (
            <a
              href={product.checkoutUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              style={{
                backgroundColor: theme.buttonVariant === 'outline' ? 'transparent' : theme.accent,
                color: theme.buttonVariant === 'outline' ? theme.accent : '#ffffff',
                border: theme.buttonVariant === 'outline' ? `1px solid ${theme.accent}` : undefined
              }}
            >
              Reserve via Square
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold opacity-60"
              style={{ border: `1px dashed ${theme.border}`, color: theme.muted }}
            >
              {soldOut ? 'Sold out' : inlineDisabled ? 'Inline checkout coming soon' : 'Unavailable'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
