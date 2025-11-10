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
  const [saleIntro, setSaleIntro] = useState({ title: '', titleIcon: null, subheading: '', intro: [] });
  const [galleryImages, setGalleryImages] = useState([]);

  useEffect(() => {
    let alive = true;
    
    // Fetch products
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
        const doc = await sanityClient.fetch('*[_type == "salePage"][0]{ title, titleIcon, subheading, intro }').catch(() => null);
        if (!alive) return;
        if (doc) setSaleIntro({ 
          title: doc.title || '', 
          titleIcon: doc.titleIcon || null,
          subheading: doc.subheading || '', 
          intro: Array.isArray(doc.intro) ? doc.intro : [] 
        });
      } catch (_) { /* ignore */ }
    })();
    
    // Fetch gallery images from Cloudinary (tagged 'pie') and local /images folder
    (async () => {
      try {
        const images = [];
        
        // Fetch from Cloudinary API
        try {
          const cloudinaryRes = await fetch('/api/search-images?query=pie&per_page=50', {
            headers: { Accept: 'application/json' }
          });
          if (cloudinaryRes.ok) {
            const cloudinaryData = await cloudinaryRes.json();
            if (Array.isArray(cloudinaryData.images)) {
              images.push(...cloudinaryData.images.map((img) => ({
                id: img.asset_id || img.public_id,
                url: img.thumbnail_url || img.large_url,
                width: img.width ? Math.min(img.width, 320) : 300,
                height: img.height ? Math.round((Math.min(img.width, 320) / img.width) * img.height) : 380,
              })));
            }
          }
        } catch (e) {
          console.error('Cloudinary fetch failed:', e);
        }
        
        // Add local /images folder images
        const localImages = [
          '2f4a4f32-21ae-47fc-bcf1-f4e2439294bc_3000.jpg',
          '819af5c9-a882-4a4d-a1f1-357762a78ebd_3000.jpg',
          '927eec02-f5a6-4501-8a83-edd2af06f973_3000.jpg',
          'a847c096-4191-454a-82a2-35e6fd246b2a_2645.jpg',
          'DP-14936-049.jpg',
          'DP-15526-010.jpg',
          'DP-30169-001.jpg',
          'DP800004.jpg',
          'DP823463.jpg',
          'DP885938.jpg',
          'DPB874625.jpg',
          'DT1939.jpg',
          'DT4854.jpg',
        ];
        
        localImages.forEach((filename, idx) => {
          images.push({
            id: `local-${idx}`,
            url: `/images/${filename}`,
            width: 300,
            height: 380,
          });
        });
        
        if (!alive) return;
        setGalleryImages(images);
      } catch (e) {
        console.error('Error fetching gallery images:', e);
      }
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
                  {saleIntro.title && (
                    <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-2 tracking-tight flex items-center gap-3">
                      {saleIntro.titleIcon && (
                        <span className="text-5xl md:text-6xl" role="img" aria-label="icon">
                          {saleIntro.titleIcon.provider === 'emoji' 
                            ? saleIntro.titleIcon.name 
                            : saleIntro.titleIcon.name || '✨'}
                        </span>
                      )}
                      <span>{saleIntro.title}</span>
                    </h1>
                  )}
                  {saleIntro.subheading && (
                    <h2 className="text-xl md:text-2xl font-semibold text-neutral-700 mb-2">
                      {saleIntro.subheading}
                    </h2>
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
              <DraggableMasonry images={galleryImages} />
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