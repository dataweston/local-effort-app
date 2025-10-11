import type { NormalizedSale } from '../../lib/sales';
import { SaleHero } from './SaleHero';
import { SalePickupDetails } from './SalePickupDetails';
import { SaleProductList } from './SaleProductList';
import { SaleTracker } from './SaleTracker';

export function SaleRenderer({ sale }: { sale: NormalizedSale }) {
  const background = sale.theme.backgroundColor ?? '#0f172a';
  const foreground = sale.theme.foregroundColor ?? '#f8fafc';
  const accent = sale.theme.accentColor ?? '#f97316';

  return (
    <div style={{ backgroundColor: background, color: foreground }} className="min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-24 pt-12 sm:px-6 lg:px-8">
        <SaleHero sale={sale} accentColor={accent} />
        <SaleTracker sale={sale} accentColor={accent} />
        <SalePickupDetails sale={sale} />
        <SaleProductList sale={sale} accentColor={accent} />
      </div>
    </div>
  );
}
