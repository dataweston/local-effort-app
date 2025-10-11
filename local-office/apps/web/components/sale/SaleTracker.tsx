import type { NormalizedSale } from '../../lib/sales';

export function SaleTracker({ sale, accentColor }: { sale: NormalizedSale; accentColor: string }) {
  const soldCount = sale.stats?.soldCount;
  if (soldCount === null || soldCount === undefined) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm shadow-md backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] opacity-70">Live tracker</p>
      <p className="text-3xl font-semibold" style={{ color: accentColor }}>
        {soldCount}
      </p>
      <p className="text-xs opacity-70">Orders placed so far</p>
      <p className="text-xs opacity-60">(Updates every webhook ping from Square)</p>
    </section>
  );
}
