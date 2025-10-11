import type { NormalizedSale } from '../../lib/sales';
import type { SaleTheme } from './theme';

function formatDate(value?: string | null, timezone?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  const timeZone = timezone ?? 'America/Chicago';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone
    }).format(date);
  } catch (error) {
    console.warn('[sale] failed to format pickup window', { value, timezone, error });
    return date.toLocaleString();
  }
}

export function SalePickupDetails({ sale, theme }: { sale: NormalizedSale; theme: SaleTheme }) {
  const pickup = sale.pickupWindow;
  if (!pickup) {
    return null;
  }

  const start = formatDate(pickup.start, pickup.timezone);
  const end = formatDate(pickup.end, pickup.timezone);

  return (
    <section
      className="grid gap-6 rounded-3xl border p-8 text-sm leading-relaxed shadow-lg backdrop-blur"
      style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }}
    >
      <div className="space-y-1">
  <h2 className="text-xl font-semibold">Pickup window</h2>
  <p style={{ color: theme.muted }}>
          {start && end ? `${start} – ${end}` : start ?? end ?? 'See instructions below'}
          {pickup.timezone ? ` (${pickup.timezone})` : ''}
        </p>
      </div>

      {pickup.locationName ? (
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: theme.muted }}>
            Location
          </p>
          <p className="text-base font-medium">{pickup.locationName}</p>
          {Array.isArray(pickup.addressLines) && pickup.addressLines.length > 0 ? (
            <address className="not-italic text-sm" style={{ color: theme.muted }}>
              {pickup.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
          ) : null}
        </div>
      ) : null}

      {pickup.instructions ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: theme.muted }}>
            Instructions
          </p>
          <p className="max-w-2xl text-base" style={{ color: theme.foreground }}>
            {pickup.instructions}
          </p>
        </div>
      ) : null}
    </section>
  );
}
