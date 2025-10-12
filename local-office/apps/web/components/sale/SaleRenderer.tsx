import type { NormalizedSale } from '../../lib/sales';
import { SaleHero } from './SaleHero';
import { SalePickupDetails } from './SalePickupDetails';
import { SaleFaq } from './SaleFaq';
import { SaleProductList } from './SaleProductList';
import { SaleStructuredData } from './SaleStructuredData';
import { SaleTracker } from './SaleTracker';
import { SaleTrackingScripts } from './SaleTrackingScripts';
import { createSaleTheme, saleThemeStyles } from './theme';

export function SaleRenderer({ sale }: { sale: NormalizedSale }) {
  const theme = createSaleTheme(sale);
  const styles = saleThemeStyles(theme);

  const pageStyle =
    theme.layout === 'paikka'
      ? { background: `linear-gradient(135deg, ${theme.background} 0%, #ffffff 85%)`, color: theme.foreground }
      : { backgroundColor: theme.background, color: theme.foreground };

  return (
    <>
      <SaleTrackingScripts sale={sale} />
      <div style={pageStyle} className="min-h-screen">
        <div
          className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
          style={styles}
        >
          <SaleStructuredData sale={sale} />
          <SaleHero sale={sale} theme={theme} />
          <SaleTracker sale={sale} theme={theme} />
          <SalePickupDetails sale={sale} theme={theme} />
          <SaleProductList sale={sale} theme={theme} />
          <SaleFaq sale={sale} theme={theme} />
        </div>
      </div>
    </>
  );
}
