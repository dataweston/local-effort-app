import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useCart } from '../store/cart/CartContext';
import ProductCard from '../store/components/ProductCard';
import CheckoutPanel from '../store/components/CheckoutPanel';
import { PortableText } from '@portabletext/react';
import { portableTextComponents } from '../utils/portableTextComponents';
import sanityClient from '../sanityClient';
import DraggableMasonry from '../components/sale/DraggableMasonry';

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
    <div className="relative min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <Helmet>
        <title>SALE | Local Effort</title>
        <meta name="description" content="Shop Local Effort sale items. Pickup/local service with on-site checkout." />
        <link rel="canonical" href="https://localeffortfood.com/sale" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      {/* Subtle dot pattern background */}
      <div className="absolute inset-0 opacity-30" 
           style={{
             backgroundImage: 'radial-gradient(circle, rgba(251, 146, 60, 0.15) 1px, transparent 1px)',
             backgroundSize: '24px 24px'
           }} 
      />

      <div className="relative mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative inline-block"
          >
            <div className="bg-white/90 backdrop-blur-md px-8 py-6 rounded-2xl shadow-xl border-2 border-orange-200/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-2 tracking-tight">
                    holiday pie sale ✨
                  </h1>
                  <p className="text-lg text-neutral-700">
                    pickup at Henry & Son 11/26 (day before thanksgiving)
                  </p>
                  <p className="text-base text-neutral-600 mt-1">
                    we'll get some christmas dates up soon too.
                  </p>
                  {saleIntro.subheading && (
                    <p className="mt-2 text-neutral-700">{saleIntro.subheading}</p>
                  )}
                  {Array.isArray(saleIntro.intro) && saleIntro.intro.length > 0 && (
                    <div className="prose prose-neutral max-w-none mt-3">
                      <PortableText value={saleIntro.intro} components={portableTextComponents} />
                    </div>
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  <button 
                    onClick={openCart} 
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap text-lg"
                  >
                    Cart ({totalQty})
                  </button>
                </div>
              </div>
            </div>
            
            {/* Decorative tape effect */}
            <div className="absolute -top-2 -right-2 w-16 h-10 bg-amber-100/80 rotate-12 shadow-md rounded-sm" />
            <div className="absolute -bottom-2 -left-2 w-16 h-10 bg-orange-100/80 -rotate-12 shadow-md rounded-sm" />
          </motion.div>
        </div>

        {/* Hint for draggable images */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="hidden lg:flex items-center gap-2 mb-4 text-sm text-neutral-600"
        >
          <span className="text-2xl">👆</span>
          <span className="font-medium">drag the photos around to create your own layout</span>
        </motion.div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Masonry Gallery - takes up 7 columns on desktop */}
          <div className="hidden lg:block lg:col-span-7">
            <div className="relative">
              <DraggableMasonry />
            </div>
          </div>

          {/* Products Section - takes up 5 columns on desktop */}
          <div className="lg:col-span-5">
            {loading ? (
              <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border-2 border-orange-200/50">
                <div className="flex items-center justify-center">
                  <div className="animate-pulse text-neutral-600">Loading delicious pies...</div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {(products || []).map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="group relative"
                  >
                    {/* Magic card effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-300" />
                    
                    <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border-2 border-orange-200/50 overflow-hidden transition-all duration-300 group-hover:shadow-2xl">
                      <ProductCard product={p} />
                    </div>
                    
                    {/* Random tape decorations on some cards */}
                    {idx % 3 === 0 && (
                      <div className="absolute -top-1 -right-1 w-12 h-8 bg-amber-100/70 rotate-12 shadow-sm pointer-events-none" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile: Show simplified gallery below products */}
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <h2 className="text-2xl font-bold text-neutral-900 mb-4 text-center">
                gallery 📸
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Simplified static grid for mobile */}
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05, rotate: Math.random() * 4 - 2 }}
                    className="aspect-[3/4] rounded-lg overflow-hidden shadow-md bg-white p-2"
                  >
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 rounded" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <CheckoutPanel />
    </div>
  );
};

export default SalePage;
