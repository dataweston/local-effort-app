import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { SITE_URL, CONTACT_EMAIL, SOCIAL_LINKS } from '../config/siteMetadata';
import { MERCHANT_RETURN_POLICY_JSON_LD } from '../config/returnPolicy';
import { useCart } from '../store/cart/CartContext';
import ProductGrid from '../store/components/ProductGrid';
import CartDrawer from '../store/components/CartDrawer';
import ChezGarageDialogs from '../store/components/ChezGarageDialogs';
import { ptToHtml } from '../store/data/ptToHtml';
import generatedChezGaragePageData from '../store/data/generatedChezGaragePageData.json';

const STORE_SLUG = 'chez-garage';
const HERO_IMAGE_PATH = '/images/chez-garage-hero.jpg';

// Search- and model-facing title. The Sanity label is lowercase shop copy, not
// a snippet; this is the keyword-bearing one and matches routes.js.
const SEO_TITLE = 'Chez Garage — Hyper-Casual Dining Pop-Up in Edina | Local Effort Cooperative';

// The build-time catalogue snapshot (scripts/generate-sale-page-data.js). The
// page still refreshes from /api/store/products on mount, but a crawler that
// never runs that fetch now gets the full grid and full Product JSON-LD out of
// the prerendered HTML instead of an empty <section>.
const INITIAL_PRODUCTS = Array.isArray(generatedChezGaragePageData?.products)
  ? generatedChezGaragePageData.products
  : [];

// The run this page is selling. Dates drive both the visible copy and the
// FoodEvent JSON-LD, so they are stated once.
const RUN = {
  name: 'Chez Garage: Edina',
  neighborhood: 'Edina',
  startDate: '2026-07-30',
  endDate: '2026-08-02',
  humanDates: 'Thursday July 30 - Sunday August 2',
  deliveryMinimum: 75,
  addressLocality: 'Edina',
  addressRegion: 'MN',
};

// Offers stay valid to the end of the run; Google drops offers with a stale or
// missing priceValidUntil.
const PRICE_VALID_UNTIL = RUN.endDate;

const getProductSummary = (product) => {
  const portableText = ptToHtml(product?.longDescriptionBlocks);
  const summary = (portableText || product?.longDescription || product?.shortDescription || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!summary) return '';
  return summary.length > 170 ? `${summary.slice(0, 167).trim()}...` : summary;
};

const dollars = (cents) => (cents / 100).toFixed(2);

// A product priced entirely through its variants (Frozen Pizzas) has price 0 on
// the parent, which would publish a $0.00 offer. Those get an AggregateOffer
// across the variant prices instead.
const buildOffer = (product, url) => {
  const variantPrices = (product.variants || [])
    .map((variant) => variant?.price)
    .filter((price) => typeof price === 'number' && price > 0);
  const basePrice = product.salePrice ?? product.price;
  const inStock = !(product.inventoryManaged && (product.inventory ?? 0) <= 0);
  const availability = inStock
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const shared = {
    url,
    priceCurrency: 'USD',
    availability,
    itemCondition: 'https://schema.org/NewCondition',
    priceValidUntil: PRICE_VALID_UNTIL,
    seller: {
      '@type': 'Organization',
      name: 'Local Effort Cooperative',
      url: SITE_URL,
    },
    hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY_JSON_LD,
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: 0,
        currency: 'USD',
      },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'US',
        addressRegion: 'MN',
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
      },
    },
  };

  if (!basePrice && variantPrices.length) {
    return {
      '@type': 'AggregateOffer',
      offerCount: variantPrices.length,
      lowPrice: dollars(Math.min(...variantPrices)),
      highPrice: dollars(Math.max(...variantPrices)),
      ...shared,
    };
  }

  return {
    '@type': 'Offer',
    price: dollars(basePrice || 0),
    ...shared,
  };
};

const ChezGaragePage = () => {
  const { totalQty, openCart } = useCart();
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState(INITIAL_PRODUCTS.length === 0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/store/products?store=${encodeURIComponent(STORE_SLUG)}`);
        const data = res.ok ? await res.json() : { products: [] };
        if (alive && Array.isArray(data.products) && data.products.length) {
          setProducts(data.products);
        }
      } catch (_) {
        // Keep the build-time snapshot when the live refresh fails.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canonical = `${SITE_URL}/${STORE_SLUG}`;
  const heroImage = `${SITE_URL}${HERO_IMAGE_PATH}`;

  // Kept under ~160 characters and product-independent: the earlier version
  // spliced the first four product titles in at character 120, which is inside
  // the window Google actually shows.
  const metaDescription = `Chez Garage: hyper-casual dining from Local Effort Cooperative — a pop-up in Edina, July 30–Aug 2. Pub pizza, smoked meats, and pantry goods, pickup or local delivery.`;

  const schema = useMemo(() => {
    const productList = products.map((product, idx) => {
      const url = `${canonical}#${product.slug || product.id}`;
      const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
      return {
        '@type': 'ListItem',
        position: idx + 1,
        url,
        item: {
          '@type': 'Product',
          '@id': url,
          name: product.title,
          image: images.length ? images : [heroImage],
          description: getProductSummary(product) || `${product.title} from Chez Garage, a hyper-casual dining pop-up by Local Effort Cooperative.`,
          sku: product.squareVariationId || product.squareItemId || product.id,
          // Handmade food made by the cooperative: no manufacturer barcode
          // exists, which is exactly what Google wants stated rather than faked.
          brand: {
            '@type': 'Brand',
            name: 'Local Effort Cooperative',
          },
          category: 'Food, Beverages & Tobacco > Food Items',
          offers: buildOffer(product, url),
        },
      };
    });

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': `${canonical}#page`,
          name: 'Chez Garage — Hyper-Casual Dining Pop-Up',
          url: canonical,
          description: metaDescription,
          inLanguage: 'en-US',
          isPartOf: { '@id': `${SITE_URL}#website` },
          primaryImageOfPage: heroImage,
          about: { '@id': `${canonical}#event` },
          mainEntity: { '@id': `${canonical}#sale-items` },
        },
        {
          '@type': 'Organization',
          '@id': `${SITE_URL}#organization`,
          name: 'Local Effort Cooperative',
          url: SITE_URL,
          email: CONTACT_EMAIL,
          sameAs: SOCIAL_LINKS,
          areaServed: {
            '@type': 'AdministrativeArea',
            name: 'Minneapolis–St. Paul, Minnesota',
          },
        },
        {
          '@type': 'FoodEvent',
          '@id': `${canonical}#event`,
          name: RUN.name,
          description: `Chez Garage is a hyper-casual dining pop-up from Local Effort Cooperative: pub pizza, smoked and braised meats, and pantry goods to take home, served out of a garage in ${RUN.neighborhood}.`,
          startDate: RUN.startDate,
          endDate: RUN.endDate,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          image: heroImage,
          url: canonical,
          location: {
            '@type': 'Place',
            name: `Chez Garage, ${RUN.neighborhood}`,
            address: {
              '@type': 'PostalAddress',
              addressLocality: RUN.addressLocality,
              addressRegion: RUN.addressRegion,
              addressCountry: 'US',
            },
          },
          organizer: { '@id': `${SITE_URL}#organization` },
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${canonical}#breadcrumbs`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Chez Garage', item: canonical },
          ],
        },
        {
          '@id': `${canonical}#sale-items`,
          '@type': 'ItemList',
          name: 'Chez Garage menu',
          numberOfItems: productList.length,
          itemListElement: productList,
        },
      ],
    };
  }, [canonical, heroImage, metaDescription, products]);

  return (
    <div className="le-sale-page">
      <Helmet>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={metaDescription} />
        <meta
          name="keywords"
          content="hyper-casual dining, Chez Garage, Edina pop-up restaurant, Minneapolis pop-up dinner, pub pizza Minneapolis, frozen pizza Minneapolis, backyard party catering, Local Effort Cooperative"
        />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <meta name="geo.region" content="US-MN" />
        <meta name="geo.placename" content="Edina, Minnesota" />

        <meta property="og:site_name" content="Local Effort Cooperative" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:image:width" content="1920" />
        <meta property="og:image:height" content="1280" />
        <meta property="og:image:alt" content="Weathered garage doors beneath large red GARAGE letters" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={heroImage} />
        <meta name="twitter:image:alt" content="Weathered garage doors beneath large red GARAGE letters" />

        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <header className="le-sale-header">
        <button
          type="button"
          className="le-sale-bag-btn"
          onClick={openCart}
          aria-label={`Open bag, ${totalQty} item${totalQty !== 1 ? 's' : ''}`}
        >
          Bag{totalQty > 0 ? ` (${totalQty})` : ''}
        </button>
      </header>

      <main id="products" className="le-sale-main">
        <h1 className="sr-only">Chez Garage</h1>
        <section
          className="le-sale-hero le-sale-hero--chez-garage"
          aria-labelledby="chez-garage-title"
        >
          <h2 id="chez-garage-title" className="sr-only">{RUN.name}</h2>
          <img
            src={HERO_IMAGE_PATH}
            alt="Weathered garage doors beneath large red GARAGE letters"
            width="1920"
            height="1280"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className="le-sale-hero-copy">
            <strong>{RUN.name}</strong>
            <span>{RUN.humanDates}</span>
            <span>Delivery minimum ${RUN.deliveryMinimum}</span>
          </div>
        </section>

        <ChezGarageDialogs />

        <section className="le-sale-products" aria-labelledby="chez-garage-products-title">
          <h2 id="chez-garage-products-title" className="le-sale-section-title">
            Order from Chez Garage
          </h2>
          <ProductGrid
            products={products}
            skuPrefix="CG"
            loading={loading}
            basePath={`/${STORE_SLUG}`}
            showSku={false}
            showDetailRow={false}
          />
        </section>
      </main>

      <CartDrawer store={STORE_SLUG} />
    </div>
  );
};

export default ChezGaragePage;
