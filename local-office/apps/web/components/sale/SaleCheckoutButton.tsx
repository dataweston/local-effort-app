import type { NormalizedSaleProduct, SaleCheckoutMode } from '../../lib/sales';
import type { SaleTheme } from './theme';

export type SaleCheckoutButtonProps = {
  product: NormalizedSaleProduct;
  theme: SaleTheme;
  checkoutMode: SaleCheckoutMode | null | undefined;
  // eslint-disable-next-line no-unused-vars
  onInlineCheckout?: (product: NormalizedSaleProduct) => void;
};

export function SaleCheckoutButton({ product, theme, checkoutMode, onInlineCheckout }: SaleCheckoutButtonProps) {
  const manualInventory = product.inventoryMode === 'manual' ? product.manualInventory : null;
  const soldOut = typeof manualInventory === 'number' && manualInventory <= 0;
  const isInlineCheckout = checkoutMode === 'inline';
  const inlineDisabled = isInlineCheckout && !onInlineCheckout;

  if (!soldOut && !isInlineCheckout && product.checkoutUrl) {
    return (
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
    );
  }

  if (!soldOut && isInlineCheckout && onInlineCheckout) {
    return (
      <button
        type="button"
        onClick={() => onInlineCheckout(product)}
        className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        style={{
          backgroundColor: theme.accent,
          color: '#ffffff'
        }}
      >
        Start checkout
      </button>
    );
  }

  const message = soldOut
    ? 'Sold out'
    : isInlineCheckout && inlineDisabled
      ? 'Inline checkout coming soon'
      : 'Unavailable';

  return (
    <button
      type="button"
      disabled
      className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold opacity-60"
      style={{ border: `1px dashed ${theme.border}`, color: theme.muted }}
    >
      {message}
    </button>
  );
}
