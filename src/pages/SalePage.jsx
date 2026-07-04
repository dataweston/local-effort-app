import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

// Search-facing title — keyword-first, independent of the Sanity page label
// (which is lowercase shop copy, not a search snippet). Matches routes.js /sale.
const SEO_TITLE = 'Shop Seasonal Food Drops & Preorders | Local Effort Cooperative';

const getProductSummary = (product) => {
  const portableText = ptToHtml(product?.longDescriptionBlocks);
  const summary = (portableText || product?.longDescription || product?.shortDescription || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!summary) return '';
  return summary.length > 170 ? `${summary.slice(0, 167).trim()}...` : summary;
};

const SalePage = () => {
  const { totalQty, openCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const openSlug = location.hash ? location.hash.slice(1) : null;
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState(INITIAL_PRODUCTS.length === 0);
  const [livePage, setLivePage] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/store/products?store=sale');
        const data = res.ok ? await res.json() : { products: [] };
        if (alive) {
          if (Array.isArray(data.products)) setProducts(data.products);
          if (data.page && typeof data.page === 'object') setLivePage(data.page);
        }
      } catch (_) {
        // Keep the build-time snapshot when live refresh fails.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const pageTitle = livePage?.title || INITIAL_PAGE.title || FALLBACK_TITLE;

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
        <title>{SEO_TITLE}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content="Local Effort sale, Minneapolis food preorder, prepared foods Minneapolis, pantry goods Minneapolis, local delivery food, seasonal food drop" />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/sale`} />
        {heroImage && <meta property="og:image" content={heroImage} />}
        {heroImage && <meta name="twitter:image" content={heroImage} />}
        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={`${SITE_URL}/sale`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <a href="#products" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-white focus:px-3 focus:py-2 focus:text-xs focus:uppercase focus:tracking-widest focus:border focus:border-black">
        Skip to products
      </a>

      <nav className="le-sale-breadcrumb" aria-label="Breadcrumb">
        <Link to="/" className="le-sale-breadcrumb-link">← Home</Link>
        <Link to="/julydinner" className="le-sale-breadcrumb-link">Dinner in July — July 17 →</Link>
        <button
          type="button"
          className="le-sale-bag-btn"
          onClick={openCart}
          aria-label={`Open bag, ${totalQty} item${totalQty !== 1 ? 's' : ''}`}
        >
          Bag{totalQty > 0 ? ` (${totalQty})` : ''}
        </button>
      </nav>

      <main id="products" className="le-sale-main">
        <section className="le-sale-products" aria-labelledby="sale-products-title">
          <h1 id="sale-products-title" className="sr-only">
            {pageTitle} — seasonal food drops, pantry goods, and preorders from Local Effort Cooperative in Minneapolis
          </h1>
          <ProductGrid
            products={products}
            skuPrefix="LE"
            loading={loading}
            openSlug={openSlug}
            onOpen={(slug) => navigate(`/sale#${slug}`, { replace: false })}
            onClose={() => navigate('/sale', { replace: false })}
          />
        </section>
      </main>

      <CartDrawer store="sale" />
    </div>
  );
};

export default SalePage;
