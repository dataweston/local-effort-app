import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useCart } from '../store/cart/CartContext';
import ProductCard from '../store/components/ProductCard';
import CheckoutPanel from '../store/components/CheckoutPanel';
import { PortableText } from '@portabletext/react';
import { portableTextComponents } from '../utils/portableTextComponents';
import sanityClient from '../sanityClient';

const TinyDinerSalePage = () => {
  const { totalQty, openCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saleIntro, setSaleIntro] = useState({ subheading: '', intro: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/store/products?store=tiny-diner');
        const data = res.ok ? await res.json() : { products: [] };
        if (!alive) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (e) {
        if (!alive) return;
        setProducts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    // Fetch Sale page intro from Sanity (optional)
    (async () => {
      try {
        const doc = await sanityClient
          .fetch('*[_type == "tinyDinerSalePage"][0]{ subheading, intro }')
          .catch(() => null);
        if (!alive) return;
        if (doc) setSaleIntro({ subheading: doc.subheading || '', intro: Array.isArray(doc.intro) ? doc.intro : [] });
      } catch (_) { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);

  const schema = useMemo(() => {
    const items = (products || []).map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Product',
        name: p.title,
        image: Array.isArray(p.images) ? p.images.filter(Boolean) : (p.images ? [p.images] : []),
        description: p.shortDescription,
        sku: p.squareVariationId || p.squareItemId || p.id,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: (p.salePrice ?? p.price) / 100,
          availability: 'https://schema.org/InStock',
        },
      },
    }));
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Tiny Diner Sale',
      itemListElement: items,
    };
  }, [products]);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8">
      <Helmet>
        <title>Tiny Diner Sale | Local Effort</title>
        <meta
          name="description"
          content="Shop the Tiny Diner partner sale from Local Effort. Seasonal selections available for local pickup."
        />
        <link rel="canonical" href="https://localeffortfood.com/tiny-diner" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h1 className="heading-xl heading-balance">Tiny Diner Sale</h1>
          {saleIntro.subheading && (
            <p className="mt-1 text-neutral-700">{saleIntro.subheading}</p>
          )}
          {Array.isArray(saleIntro.intro) && saleIntro.intro.length > 0 && (
            <div className="prose prose-neutral max-w-none mt-3">
              <PortableText value={saleIntro.intro} components={portableTextComponents} />
            </div>
          )}
        </div>
        <button onClick={openCart} className="btn btn-primary whitespace-nowrap">Cart ({totalQty})</button>
      </div>

      <div className="mb-6 rounded-lg bg-amber-50 border-l-4 border-amber-500 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-amber-800">Pickup Information</h3>
            <p className="mt-1 text-sm text-amber-700">
              <strong>When:</strong> October 31, 2025 • 4-7pm<br />
              <strong>Where:</strong> Tiny Diner, 1024 E 38th St, Minneapolis
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {(products || []).map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <ProductCard product={p} />
            </motion.div>
          ))}
        </div>
      )}

      <CheckoutPanel store="tiny-diner" />
    </div>
  );
};

export default TinyDinerSalePage;
