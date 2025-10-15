import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useCart } from '../store/cart/CartContext';
import ProductCard from '../store/components/ProductCard';
import CheckoutPanel from '../store/components/CheckoutPanel';
import { PortableText } from '@portabletext/react';
import { portableTextComponents } from '../utils/portableTextComponents';
import sanityClient from '../sanityClient';
import { Card, CardContent } from '../components/ui/card';
import { Info, MapPin, Clock } from 'lucide-react';

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

      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-neutral-900 mb-3">
            PIZZA AT TINY DINER
          </h1>
          {saleIntro.subheading && (
            <p className="text-xl text-neutral-600 font-medium mb-4">{saleIntro.subheading}</p>
          )}
          {Array.isArray(saleIntro.intro) && saleIntro.intro.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardContent className="pt-4">
                <div className="prose prose-neutral prose-amber max-w-none">
                  <PortableText value={saleIntro.intro} components={portableTextComponents} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <button onClick={openCart} className="btn btn-primary whitespace-nowrap flex-shrink-0">Cart ({totalQty})</button>
      </div>

      <Card className="mb-6 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-amber-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Pickup Information
              </h3>
              <div className="text-sm text-amber-800 space-y-1">
                <p className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>When:</strong> October 31, 2025 • 4-7pm</span>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Where:</strong> Tiny Diner, 1024 E 38th St, Minneapolis</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
