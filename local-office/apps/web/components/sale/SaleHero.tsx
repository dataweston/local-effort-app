import type { NormalizedSale } from '../../lib/sales';

export function SaleHero({ sale, accentColor }: { sale: NormalizedSale; accentColor: string }) {
  const eyebrow = sale.hero?.eyebrow ?? sale.square?.webhookTag;
  const heading = sale.hero?.heading ?? sale.title;
  const subheading = sale.hero?.subheading ?? sale.tagline;
  const body = sale.hero?.body;
  const imageUrl = sale.hero?.imageUrl;

  return (
    <header className="grid items-center gap-10 lg:grid-cols-[1.2fr,0.8fr] lg:gap-16">
      <div className="space-y-5">
        {eyebrow ? (
          <span className="text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: accentColor }}>
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{heading}</h1>
        {subheading ? <p className="text-lg opacity-90">{subheading}</p> : null}
        {body ? <p className="max-w-2xl text-base leading-relaxed opacity-80">{body}</p> : null}
      </div>
      {imageUrl ? (
        <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={heading ?? 'Sale hero'}
            className="h-full w-full object-cover"
            loading="eager"
          />
        </div>
      ) : null}
    </header>
  );
}
