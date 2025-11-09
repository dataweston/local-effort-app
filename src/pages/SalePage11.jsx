import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useCart } from '../store/cart/CartContext';
import ProductCard from '../store/components/ProductCard';
import CheckoutPanel from '../store/components/CheckoutPanel';
import { PortableText } from '@portabletext/react';
import { portableTextComponents } from '../utils/portableTextComponents';
import sanityClient from '../sanityClient';
import DraggableCardGallery from '../components/sale/DraggableCardGallery';

const SalePage11 = () => {
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
        <title>SALE 11 - Draggable Cards | Local Effort</title>
        <meta name="description" content="Shop Local Effort sale items with interactive draggable card gallery." />
        <link rel="canonical" href="https://localeffortfood.com/sale11" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      {/* Full-page draggable card gallery background */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <DraggableCardGallery />
      </div>

      {/* Content overlay with products */}
      <div className="relative" style={{ zIndex: 10 }}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between mb-4 gap-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-md">
            <div>
              <h1 className="heading-xl heading-balance">Sale 11 - Draggable Cards</h1>
              <p className="mt-1 text-sm text-neutral-500">Testing: Aceternity Draggable Card Style</p>
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

          {loading ? (
            <div className="bg-white/95 backdrop-blur-sm p-8 rounded-lg shadow-md">Loading…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
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

export default SalePage11;
