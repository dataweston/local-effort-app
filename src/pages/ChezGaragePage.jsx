import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import { SITE_URL } from '../config/siteMetadata';
import { useCart } from '../store/cart/CartContext';
import ProductGrid from '../store/components/ProductGrid';
import CartDrawer from '../store/components/CartDrawer';
import { ptToHtml } from '../store/data/ptToHtml';

const STORE_SLUG = 'chez-garage';
const PAGE_TITLE = 'chez garage';
const PAGE_SUBHEADING = 'Freezer-ready mains, pantry staples, and dessert in one compact drop.';
const PAGE_INTRO = `A smaller sale page built on the same bag-and-checkout flow as the main store.

Stock the freezer with lamb chili and pizzas, then round things out with chocolate, pork belly, and olive oil.`;

const getProductSummary = (product) => {
  const portableText = ptToHtml(product?.longDescriptionBlocks);
  const summary = (portableText || product?.longDescription || product?.shortDescription || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!summary) return '';
  return summary.length > 170 ? `${summary.slice(0, 167).trim()}...` : summary;
};

const ChezGaragePage = () => {
  const { totalQty, openCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/store/products?store=${encodeURIComponent(STORE_SLUG)}`);
        const data = res.ok ? await res.json() : { products: [] };
        if (alive && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } catch (_) {
        if (alive) {
          setProducts([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canonical = `${SITE_URL}/${STORE_SLUG}`;
  const heroImage = products.find((product) => Array.isArray(product.images) && product.images[0])?.images?.[0] || null;

  const metaDescription = useMemo(() => {
    const names = products.slice(0, 4).map((product) => product.title).filter(Boolean);
    const namesLabel = names.length ? ` including ${names.join(', ')}` : '';
    return `Shop ${PAGE_TITLE}${namesLabel}. Frozen pizzas, lamb chili, pantry goods, and dessert with the Local Effort bag-and-checkout flow.`;
  }, [products]);

  const schema = useMemo(() => {
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
          name: 'Local Effort Food Co.'
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
            name: 'Local Effort Food Co.',
            url: SITE_URL
          }
        }
      }
    }));

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: PAGE_TITLE,
          url: canonical,
          description: metaDescription,
          mainEntity: {
            '@id': `${canonical}#sale-items`
          }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: SITE_URL
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: PAGE_TITLE,
              item: canonical
            }
          ]
        },
        {
          '@id': `${canonical}#sale-items`,
          '@type': 'ItemList',
          name: `${PAGE_TITLE} products`,
          numberOfItems: productList.length,
          itemListElement: productList
        }
      ]
    };
  }, [canonical, metaDescription, products]);

  return (
    <div className="le-sale-page">
      <Helmet>
        <title>{`${PAGE_TITLE} | Local Effort Food Co.`}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content="chez garage, Minneapolis food preorder, frozen pizza Minneapolis, lamb chili, olive oil, Local Effort" />
        <meta property="og:title" content={`${PAGE_TITLE} | Local Effort Food Co.`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        {heroImage && <meta property="og:image" content={heroImage} />}
        {heroImage && <meta name="twitter:image" content={heroImage} />}
        <meta name="twitter:title" content={`${PAGE_TITLE} | Local Effort Food Co.`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <a
        href="#products"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-white focus:px-3 focus:py-2 focus:text-xs focus:uppercase focus:tracking-widest focus:border focus:border-black"
      >
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
        <section className="le-sale-hero" aria-labelledby="chez-garage-title">
          <div className="le-sale-hero-copy">
            <p className="le-sale-eyebrow">Minneapolis sale</p>
            <h1 id="chez-garage-title" className="le-sale-title">{PAGE_TITLE}</h1>
            <p className="le-sale-subheading">{PAGE_SUBHEADING}</p>
            <div className="le-sale-intro">
              {PAGE_INTRO.split(/\n{2,}/).filter(Boolean).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <aside className="le-sale-summary" aria-label="Sale details">
            <div className="le-sale-summary-card">
              <span className="le-sale-summary-label">Products live</span>
              <strong className="le-sale-summary-value">{loading ? 'Updating' : products.length}</strong>
            </div>
            <div className="le-sale-summary-card">
              <span className="le-sale-summary-label">Fulfillment</span>
              <strong className="le-sale-summary-value">Pickup + local delivery</strong>
            </div>
            <div className="le-sale-summary-card">
              <span className="le-sale-summary-label">How to shop</span>
              <strong className="le-sale-summary-value">Add to bag, then pay once</strong>
            </div>
          </aside>
        </section>

        <section className="le-sale-products" aria-labelledby="chez-garage-products-title">
          <div className="le-sale-products-header">
            <div>
              <h2 id="chez-garage-products-title" className="le-sale-section-title">Current catalog</h2>
              <p className="le-sale-section-copy">
                This page uses the same bag and checkout drawer as the main sale page, so guests can combine items before paying.
              </p>
            </div>
          </div>
          <ProductGrid products={products} skuPrefix="CG" loading={loading} basePath={`/${STORE_SLUG}`} />
        </section>
      </main>

      <CartDrawer store={STORE_SLUG} />
    </div>
  );
};

export default ChezGaragePage;
