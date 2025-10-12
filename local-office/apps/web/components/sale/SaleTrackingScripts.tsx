import Script from 'next/script';

import type { NormalizedSale } from '../../lib/sales';

function MetaPixelScripts({ pixelId }: { pixelId: string }) {
  const trimmed = pixelId.trim();
  if (!trimmed) {
    return null;
  }

  const id = trimmed;

  return (
    <>
      <Script id={`fb-pixel-${id}`} strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${id}');
          fbq('track', 'PageView');
        `.replace(/\s+/g, ' ')}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

function GtagScripts({ trackingId }: { trackingId: string }) {
  const trimmed = trackingId.trim();
  if (!trimmed) {
    return null;
  }

  const id = trimmed;

  return (
    <>
      <Script id={`gtag-base-${id}`} strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
      <Script id={`gtag-config-${id}`} strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}', { send_page_view: true });
        `.replace(/\s+/g, ' ')}
      </Script>
    </>
  );
}

export function SaleTrackingScripts({ sale }: { sale: NormalizedSale }) {
  const pixelId = sale.tracking?.metaPixelId ?? '';
  const gtagId = sale.tracking?.gtagId ?? '';

  if (!pixelId && !gtagId) {
    return null;
  }

  return (
    <>
      <MetaPixelScripts pixelId={pixelId} />
      <GtagScripts trackingId={gtagId} />
    </>
  );
}
