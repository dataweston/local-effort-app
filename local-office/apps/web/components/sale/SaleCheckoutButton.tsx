'use client';

import { useCallback } from 'react';

import type { NormalizedSaleProduct, SaleCheckoutMode } from '../../lib/sales';
import { useSaleInlineCheckout } from './SaleInlineCheckout';
import type { SaleTheme } from './theme';

export type SaleCheckoutButtonProps = {
  product: NormalizedSaleProduct;
  theme: SaleTheme;
  checkoutMode: SaleCheckoutMode | null | undefined;
};

export function SaleCheckoutButton({ product, theme, checkoutMode }: SaleCheckoutButtonProps) {
  const manualInventory = product.inventoryMode === 'manual' ? product.manualInventory : null;
  const soldOut = typeof manualInventory === 'number' && manualInventory <= 0;
  const isInlineCheckout = checkoutMode === 'inline';
  const inlineContext = useSaleInlineCheckout();
  const inlineSupported = Boolean(inlineContext);

  const handleInlineCheckout = useCallback(() => {
    if (inlineContext) {
      inlineContext.startCheckout(product);
    }
  }, [inlineContext, product]);

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

  if (!soldOut && isInlineCheckout && inlineSupported) {
    return (
      <button
        type="button"
        onClick={handleInlineCheckout}
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
    : isInlineCheckout && !inlineSupported
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
