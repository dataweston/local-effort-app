'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { NormalizedSale, NormalizedSaleProduct } from '../../lib/sales';
import type { SaleTheme } from './theme';

const InlineCheckoutContext = createContext<{
  startCheckout: (product: NormalizedSaleProduct) => void; // eslint-disable-line no-unused-vars
} | null>(null);

export function useSaleInlineCheckout() {
  return useContext(InlineCheckoutContext);
}

type SaleInlineCheckoutProviderProps = {
  sale: NormalizedSale;
  theme: SaleTheme;
  children: ReactNode;
};

export function SaleInlineCheckoutProvider({ sale, theme, children }: SaleInlineCheckoutProviderProps) {
  const [activeProduct, setActiveProduct] = useState<NormalizedSaleProduct | null>(null);

  const startCheckout = useCallback((product: NormalizedSaleProduct) => {
    setActiveProduct(product);
  }, []);

  const close = useCallback(() => {
    setActiveProduct(null);
  }, []);

  const value = useMemo(() => ({ startCheckout }), [startCheckout]);

  if (sale.square?.checkoutMode !== 'inline') {
    return <>{children}</>;
  }

  return (
    <InlineCheckoutContext.Provider value={value}>
      {children}
      {activeProduct ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md space-y-4 rounded-3xl border p-6 shadow-2xl"
            style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }}
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: theme.muted }}>
                Inline checkout (Tier B)
              </p>
              <h3 className="text-xl font-semibold">{activeProduct.title}</h3>
              <p className="text-sm" style={{ color: theme.muted }}>
                Inline checkout is on the roadmap. For now, links will continue to open Square in a secure tab.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-full rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: theme.accent,
                color: '#ffffff'
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </InlineCheckoutContext.Provider>
  );
}
