import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { SITE_URL } from '../config/siteMetadata';
import { useCart } from '../store/cart/CartContext';
import ProductGrid from '../store/components/ProductGrid';
import CartDrawer from '../store/components/CartDrawer';
import { ptToHtml } from '../store/data/ptToHtml';

const STORE_SLUG = 'chez-garage';
const PAGE_TITLE = 'chez garage';

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
          name: 'Local Effort Cooperative'
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
        <title>{`${PAGE_TITLE} | Local Effort Cooperative`}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content="chez garage, Minneapolis food preorder, frozen pizza Minneapolis, lamb chili, olive oil, Local Effort" />
        <meta property="og:title" content={`${PAGE_TITLE} | Local Effort Cooperative`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        {heroImage && <meta property="og:image" content={heroImage} />}
        {heroImage && <meta name="twitter:image" content={heroImage} />}
        <meta name="twitter:title" content={`${PAGE_TITLE} | Local Effort Cooperative`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={canonical} />
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
        <h1 className="sr-only">{PAGE_TITLE}</h1>
        <section className="le-sale-hero" aria-labelledby="chez-garage-title">
          <h2 id="chez-garage-title" className="sr-only">Products</h2>
        </section>

        <section className="le-sale-products" aria-labelledby="chez-garage-products-title">
          <h2 id="chez-garage-products-title" className="sr-only">Current catalog</h2>
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
