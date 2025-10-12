import type { NormalizedSale } from '../../lib/sales';
import { SaleTrackerClient } from './SaleTrackerClient';
import type { SaleTheme } from './theme';

export function SaleTracker({ sale, theme }: { sale: NormalizedSale; theme: SaleTheme }) {
  const initialCount = typeof sale.stats?.soldCount === 'number' && Number.isFinite(sale.stats.soldCount)
    ? sale.stats.soldCount
    : 0;
  const showInitialHint = sale.stats?.soldCount === null || sale.stats?.soldCount === undefined;

  return (
    <section
      className="flex flex-col gap-2 rounded-3xl border p-6 text-sm shadow-md backdrop-blur"
      style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: theme.muted }}>
        Live tracker
      </p>
      <p className="text-3xl font-semibold" style={{ color: theme.accent }}>
        <SaleTrackerClient saleSlug={sale.slug} initialCount={initialCount} />
      </p>
      <p className="text-xs" style={{ color: theme.muted }}>
        Orders placed so far
      </p>
      <p className="text-xs" style={{ color: theme.muted }}>
        {showInitialHint ? 'Syncs after the first payment clears.' : '(Updates every webhook ping from Square)'}
      </p>
    </section>
  );
}
