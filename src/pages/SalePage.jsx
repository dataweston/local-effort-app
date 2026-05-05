import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useCart } from '../store/cart/CartContext';
import ProductGrid from '../store/components/ProductGrid';
import CartDrawer from '../store/components/CartDrawer';
import { SITE_URL } from '../config/siteMetadata';
import { ptToHtml } from '../store/data/ptToHtml';
import generatedSalePageData from '../store/data/generatedSalePageData.json';

const INITIAL_PRODUCTS = Array.isArray(generatedSalePageData?.products) ? generatedSalePageData.products : [];
const INITIAL_PAGE = generatedSalePageData?.page || {};
const INITIAL_GENERATED_AT = generatedSalePageData?.generatedAt || '';

const FALLBACK_TITLE = 'Local Effort Sale';
const FALLBACK_SUBHEADING = 'Seasonal prepared foods, pantry goods, and limited preorders.';
const FALLBACK_INTRO =
  'Browse the current Local Effort sale for seasonal drops, limited runs, and pantry staples. Open any product for larger photos, full details, and checkout options.';

const getProductSummary = (product) => {
  const portableText = ptToHtml(product?.longDescriptionBlocks);
  const summary = (portableText || product?.longDescription || product?.shortDescription || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!summary) return '';
  return summary.length > 170 ? `${summary.slice(0, 167).trim()}...` : summary;
};

const formatGeneratedDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const SalePage = () => {
  const { totalQty, openCart } = useCart();
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState(INITIAL_PRODUCTS.length === 0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/store/products?store=sale');
        const data = res.ok ? await res.json() : { products: [] };
        if (alive && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } catch (_) {
        // Keep the build-time snapshot when live refresh fails.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const pageTitle = INITIAL_PAGE.title || FALLBACK_TITLE;
  const pageSubheading = INITIAL_PAGE.subheading || FALLBACK_SUBHEADING;
  const introText = INITIAL_PAGE.introText || FALLBACK_INTRO;
  const generatedLabel = formatGeneratedDate(INITIAL_GENERATED_AT);

  const metaDescription = useMemo(() => {
    const names = products.slice(0, 3).map((product) => product.title).filter(Boolean);
    const namesLabel = names.length ? ` including ${names.join(', ')}` : '';
    return `Shop the Local Effort sale${namesLabel}. Seasonal food drops, pantry goods, and limited preorders with Minneapolis pickup and local delivery.`;
  }, [products]);
  const heroImage = products.find((product) => Array.isArray(product.images) && product.images[0])?.images?.[0] || null;

  const schema = useMemo(() => {
    const canonical = `${SITE_URL}/sale`;
    const productList = products.map((product, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${canonical}#${product.slug || product.id}`,
      item: {
        '@type': 'Product',
        name: product.title,
        image: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
        description: getProductSummary(product),
        sku: product.squareVariationId || product.squareItemId || product.id,
        brand: {
          '@type': 'Brand',
          name: 'Local Effort Cooperative',
        },
        offers: {
          '@type': 'Offer',
          url: `${canonical}#${product.slug || product.id}`,
          priceCurrency: 'USD',
          price: ((product.salePrice ?? product.price) / 100).toFixed(2),
          availability: product.inventoryManaged && (product.inventory ?? 0) <= 0
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: 'Local Effort Cooperative',
            url: SITE_URL,
          },
        },
      },
    }));

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: pageTitle,
          url: canonical,
          description: metaDescription,
          mainEntity: {
            '@id': `${canonical}#sale-items`,
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: SITE_URL,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Sale',
              item: canonical,
            },
          ],
        },
        {
          '@id': `${canonical}#sale-items`,
          '@type': 'ItemList',
          name: 'Local Effort sale products',
          numberOfItems: productList.length,
          itemListElement: productList,
        },
      ],
    };
  }, [metaDescription, pageTitle, products]);

  return (
    <div className="le-sale-page">
      <Helmet>
        <title>{`${pageTitle} | Local Effort Cooperative`}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content="Local Effort sale, Minneapolis food preorder, prepared foods Minneapolis, pantry goods Minneapolis, local delivery food, seasonal food drop" />
        <meta property="og:title" content={`${pageTitle} | Local Effort Cooperative`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/sale`} />
        {heroImage && <meta property="og:image" content={heroImage} />}
        {heroImage && <meta name="twitter:image" content={heroImage} />}
        <meta name="twitter:title" content={`${pageTitle} | Local Effort Cooperative`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={`${SITE_URL}/sale`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <a href="#products" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-white focus:px-3 focus:py-2 focus:text-xs focus:uppercase focus:tracking-widest focus:border focus:border-black">
        Skip to products
      </a>

      <header className="le-sale-header">
        <Link to="/" className="le-sale-home-link">Local Effort</Link>
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
        <section className="le-sale-hero" aria-labelledby="sale-title">
          <div className="le-sale-hero-copy">
            <p className="le-sale-eyebrow">Minneapolis sale</p>
            <h1 id="sale-title" className="le-sale-title">{pageTitle}</h1>
            <p className="le-sale-subheading">{pageSubheading}</p>
            <div className="le-sale-intro">
              {introText.split(/\n{2,}/).filter(Boolean).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <aside className="le-sale-summary" aria-label="Sale details">
            <div className="le-sale-summary-card">
              <span className="le-sale-summary-label">Products live</span>
              <strong className="le-sale-summary-value">{products.length || 'Updating'}</strong>
            </div>
            <div className="le-sale-summary-card">
              <span className="le-sale-summary-label">Fulfillment</span>
              <strong className="le-sale-summary-value">Pickup + local delivery</strong>
            </div>
            <div className="le-sale-summary-card">
              <span className="le-sale-summary-label">How to shop</span>
              <strong className="le-sale-summary-value">Open any item for full details</strong>
            </div>
            {generatedLabel && (
              <div className="le-sale-summary-card">
                <span className="le-sale-summary-label">Catalog snapshot</span>
                <strong className="le-sale-summary-value">{generatedLabel}</strong>
              </div>
            )}
          </aside>
        </section>

        <section className="le-sale-links" aria-labelledby="sale-links-title">
          <div>
            <h2 id="sale-links-title" className="le-sale-section-title">Looking for a specific event or drop?</h2>
            <p className="le-sale-section-copy">
              Some Local Effort offers live on dedicated landing pages with fuller booking and product context. These links help search engines and visitors move between the store, specialty drops, and private-event booking pages.
            </p>
          </div>
          <div className="le-sale-link-grid">
            <Link className="le-sale-link-card" to="/psyche">
              <span className="le-sale-link-title">Psyche olive oil</span>
              <span className="le-sale-link-copy">Dedicated product page with provenance, pricing, and fulfillment details.</span>
            </Link>
            <Link className="le-sale-link-card" to="/february">
              <span className="le-sale-link-title">February chef dinner</span>
              <span className="le-sale-link-copy">Private in-home dinner booking flow with date, pricing, and guest information.</span>
            </Link>
            <Link className="le-sale-link-card" to="/#small-events">
              <span className="le-sale-link-title">Small events</span>
              <span className="le-sale-link-copy">Private dinners, pizza parties, and other event windows from the main site.</span>
            </Link>
          </div>
        </section>

        <section className="le-sale-products" aria-labelledby="sale-products-title">
          <div className="le-sale-products-header">
            <div>
              <h2 id="sale-products-title" className="le-sale-section-title">Current sale catalog</h2>
              <p className="le-sale-section-copy">
                Product cards include visible names and summaries in the HTML so Google and AI crawlers can understand what the sale contains before JavaScript finishes loading.
              </p>
            </div>
          </div>
          <ProductGrid products={products} skuPrefix="LE" loading={loading} />
        </section>
      </main>

      <CartDrawer store="sale" />
    </div>
  );
};

export default SalePage;
