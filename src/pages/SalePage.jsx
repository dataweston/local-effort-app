import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useCart } from '../store/cart/CartContext';
import ProductCard from '../store/components/ProductCard';
import CheckoutPanel from '../store/components/CheckoutPanel';
import { PortableText } from '@portabletext/react';
import { portableTextComponents } from '../utils/portableTextComponents';
import sanityClient from '../sanityClient';
import MasonryGallery from '../components/sale/MasonryGallery';

const SalePage = () => {
  const { totalQty, openCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saleIntro, setSaleIntro] = useState({ subheading: '', intro: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/store/products?store=sale');
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
        const doc = await sanityClient.fetch('*[_type == "salePage"][0]{ subheading, intro }').catch(() => null);
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
      name: 'Sale',
      itemListElement: items,
    };
  }, [products]);

  return (
    <div className="relative min-h-screen">
      <Helmet>
        <title>SALE | Local Effort</title>
        <meta name="description" content="Shop Local Effort sale items. Pickup/local service with on-site checkout." />
        <link rel="canonical" href="https://localeffortfood.com/sale" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      {/* Content overlay with products */}
      <div className="relative" style={{ zIndex: 10 }}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="inline-block bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-md">
              <h1 className="heading-xl heading-balance">holiday pie sale</h1>
              <p className="mt-1 text-neutral-700">pickup at Henry & Son 11/26 (day before thanksgiving). we'll get some christmas dates up soon too.</p>
              {saleIntro.subheading && (
                <p className="mt-1 text-neutral-700">{saleIntro.subheading}</p>
              )}
              {Array.isArray(saleIntro.intro) && saleIntro.intro.length > 0 && (
                <div className="prose prose-neutral max-w-none mt-3">
                  <PortableText value={saleIntro.intro} components={portableTextComponents} />
                </div>
              )}
            </div>
            <button onClick={openCart} className="btn btn-primary whitespace-nowrap bg-white/95 backdrop-blur-sm shadow-md">Cart ({totalQty})</button>
          </div>
        </div>
      </div>

      {/* Full-page masonry gallery background - starts after header */}
      <div className="fixed top-32 left-0 right-0 bottom-0 overflow-y-auto" style={{ zIndex: 0 }}>
        <MasonryGallery />
        {/* Hint text for draggable images */}
        <div className="fixed bottom-4 left-4 text-xs text-neutral-500/60 flex items-center gap-1 pointer-events-none">
          <span role="img" aria-label="hand">👆</span>
          <span>move the images around</span>
        </div>
      </div>

      {/* Products section */}
      <div className="relative" style={{ zIndex: 10 }}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">

          {loading ? (
            <div className="ml-auto w-full max-w-md bg-white/95 backdrop-blur-sm p-8 rounded-lg shadow-md">Loading…</div>
          ) : (
            <div className="ml-auto w-full max-w-md flex flex-col gap-6 mt-6">
              {(products || []).map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white/98 backdrop-blur-sm rounded-lg shadow-lg"
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CheckoutPanel />
    </div>
  );
};

export default SalePage;
