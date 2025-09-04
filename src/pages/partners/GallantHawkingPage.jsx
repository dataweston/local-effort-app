import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PARTNER_TOOLS } from '../../config/partnerTools';

const cfg = PARTNER_TOOLS.find((t) => t.key === 'gallant');

export default function GallantHawkingPage() {
  const src = cfg?.url || cfg?.fallbackUrl;
  return (
    <>
      <Helmet>
        <title>Gallant Hawking | Partner Tool</title>
      </Helmet>
      <div className="h-[75vh] border rounded overflow-hidden">
        <iframe title="Gallant Hawking" src={src} className="w-full h-full" />
      </div>
    </>
  );
}
