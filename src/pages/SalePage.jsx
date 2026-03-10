import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../store/cart/CartContext';
import ProductGrid from '../store/components/ProductGrid';
import CartDrawer from '../store/components/CartDrawer';
import { SITE_URL } from '../config/siteMetadata';

const SalePage = () => {
  const { totalQty, openCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/store/products?store=sale');
        const data = res.ok ? await res.json() : { products: [] };
        if (alive) setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (_) {
        if (alive) setProducts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const schema = useMemo(() => {
    if (!products.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Sale',
      itemListElement: products.map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Product',
          name: p.title,
          image: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
          description: p.shortDescription,
          sku: p.squareVariationId || p.squareItemId || p.id,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: ((p.salePrice ?? p.price) / 100).toFixed(2),
            availability: 'https://schema.org/InStock',
          },
        },
      })),
    };
  }, [products]);

  return (
    <div className="le-sale-page">
      <Helmet>
        <title>Sale — Local Effort</title>
        <meta name="description" content="Shop Local Effort. Pickup and local delivery available." />
        <link rel="canonical" href={`${SITE_URL}/sale`} />
        {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
      </Helmet>

      <header className="le-sale-header">
        <a href="/" className="le-sale-home-link">Local Effort</a>
        <button
          type="button"
          className="le-sale-bag-btn"
          onClick={openCart}
          aria-label={`Open bag, ${totalQty} item${totalQty !== 1 ? 's' : ''}`}
        >
          Bag{totalQty > 0 ? ` (${totalQty})` : ''}
        </button>
      </header>

      <main>
        <ProductGrid products={products} skuPrefix="LE" loading={loading} />
      </main>

      <CartDrawer store="sale" />
    </div>
  );
};

export default SalePage;
