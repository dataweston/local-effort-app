import React from 'react';
import { Helmet } from 'react-helmet-async';

import PaikkaCheckout from '../features/paikka/PaikkaCheckout';

const PaikkaPage = () => {
  const canonical = 'https://localeffortfood.com/paikka';
  const pageTitle = 'Paikka Sandwich Presale | Local Effort';
  const pageDescription = 'Reserve Local Effort sandwiches for the Paikka presale and skip the line with a QR code pickup.';

  return (
    <div className="bg-neutral-50 pb-16 pt-10">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="px-4 sm:px-6 lg:px-10">
        <PaikkaCheckout />
      </div>
    </div>
  );
};

export default PaikkaPage;
