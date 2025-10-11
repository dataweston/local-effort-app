import type { NormalizedSale } from '../../lib/sales';
import { SaleProductCard } from './SaleProductCard';
import type { SaleTheme } from './theme';

export function SaleProductList({ sale, theme }: { sale: NormalizedSale; theme: SaleTheme }) {
  if (!sale.products.length) {
    return (
      <section
        className="rounded-3xl border border-dashed p-10 text-center text-base"
        style={{ borderColor: theme.border, color: theme.muted, backgroundColor: theme.surface }}
      >
        Product list coming soon. Check back shortly!
      </section>
    );
  }

  return (
    <section aria-label="Products" className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Menu</h2>
          <p className="text-sm" style={{ color: theme.muted }}>
            Reserve your items below. Square checkout opens each link in a secure tab.
          </p>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sale.products.map((product) => (
          <SaleProductCard
            key={product.key}
            product={product}
            theme={theme}
            checkoutMode={sale.square?.checkoutMode ?? 'link'}
          />
        ))}
      </div>
    </section>
  );
}
