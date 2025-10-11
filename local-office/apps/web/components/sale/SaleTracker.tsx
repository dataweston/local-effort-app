import type { NormalizedSale } from '../../lib/sales';
import type { SaleTheme } from './theme';

export function SaleTracker({ sale, theme }: { sale: NormalizedSale; theme: SaleTheme }) {
  const soldCount = sale.stats?.soldCount;
  if (soldCount === null || soldCount === undefined) {
    return null;
  }

  return (
    <section
      className="flex flex-col gap-2 rounded-3xl border p-6 text-sm shadow-md backdrop-blur"
      style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: theme.muted }}>
        Live tracker
      </p>
      <p className="text-3xl font-semibold" style={{ color: theme.accent }}>
        {soldCount}
      </p>
      <p className="text-xs" style={{ color: theme.muted }}>
        Orders placed so far
      </p>
      <p className="text-xs" style={{ color: theme.muted }}>
        (Updates every webhook ping from Square)
      </p>
    </section>
  );
}
