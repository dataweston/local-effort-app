import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import DinnerRegistrationModal from '../components/WinterDinner/DinnerRegistrationModal';
import Noise from '../components/ui/Noise';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import { loadExternalStylesheet } from '../utils/performance';

// Helper component for positioning elements in background coordinate system
const BgPositioned = ({ x, y, children, className = '', style = {}, ...props }) => {
  return (
    <div
      className={`absolute pointer-events-auto ${className}`}
      style={{
        left: typeof x === 'number' ? `${x}%` : x,
        top: typeof y === 'number' ? `${y}%` : y,
        transform: 'translate(-50%, -50%)', // Center the element at the coordinates
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

const WinterDinnerPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const bgImageRef = React.useRef(null);

  // SEO Configuration
  const pageTitle = 'Winter Dinner 2025 - Exclusive Multi-Course Dining Experience | Local Effort';
  const pageDescription = 'Join us for an unforgettable winter dining experience in Minneapolis. A multi-course seasonal dinner featuring locally-sourced ingredients, curated wine pairings, and exceptional hospitality. Limited seating available.';
  const canonical = `${SITE_URL}/winterdinner`;
  const eventDate = '2025-12-21T18:00:00-06:00';
  const eventEndDate = '2025-12-21T22:00:00-06:00';

  // Structured Data - Event Schema
  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'FoodEvent',
    'name': 'Local Effort Winter Dinner 2025',
    'description': pageDescription,
    'startDate': eventDate,
    'endDate': eventEndDate,
    'eventStatus': 'https://schema.org/EventScheduled',
    'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
    'location': {
      '@type': 'Place',
      'name': 'Local Effort Space',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '1024 E 38th St',
        'addressLocality': 'Minneapolis',
        'addressRegion': 'MN',
        'postalCode': '55407',
        'addressCountry': 'US'
      }
    },
    'image': `${SITE_URL}/images/sprite_flicker.gif`,
    'organizer': {
      '@type': 'Organization',
      'name': SITE_NAME,
      'url': SITE_URL,
      'logo': `${SITE_URL}/gallery/logo.png`
    },
    'offers': {
      '@type': 'Offer',
      'url': canonical,
      'price': '75.00',
      'priceCurrency': 'USD',
      'availability': 'https://schema.org/InStock',
      'validFrom': '2025-01-01T00:00:00-06:00'
    },
    'performer': {
      '@type': 'Organization',
      'name': SITE_NAME
    }
  };

  // Breadcrumb Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': SITE_URL
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Winter Dinner',
        'item': canonical
      }
    ]
  };

  const structuredData = [eventSchema, breadcrumbSchema];

  useEffect(() => {
    loadExternalStylesheet(
      'https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&family=Special+Gothic+Expanded+One&display=swap',
      { crossOrigin: 'anonymous' }
    );
  }, []);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />

        {/* Google Fonts - Cardo & Special Gothic Expanded One */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <noscript>
          <link
            href="https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&family=Special+Gothic+Expanded+One&display=swap"
            rel="stylesheet"
          />
        </noscript>

        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}/images/sprite_flicker.gif`} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={`${SITE_URL}/images/sprite_flicker.gif`} />
        <meta name="twitter:site" content="@localeffortfood" />

        {/* Additional SEO */}
        <meta name="keywords" content="winter dinner Minneapolis, private dining Minneapolis, chef's table Minneapolis, wine pairing dinner, seasonal dinner Minneapolis, fine dining Minneapolis, farm to table Minneapolis, exclusive dinner experience" />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="fixed inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
        {/* Noise Overlay */}
        <Noise
          patternSize={250}
          patternScaleX={1}
          patternScaleY={1}
          patternRefreshInterval={2}
          patternAlpha={15}
        />

        {/* Breadcrumb Navigation */}
        <nav
          className="absolute top-4 left-4 z-20"
          aria-label="Breadcrumb"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-white/60 hover:text-white/90 transition-colors duration-200 text-xs tracking-wide px-2 py-1 rounded"
            aria-label="Return to home page"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          >
            <Home size={12} />
            <span>Home</span>
          </Link>
        </nav>

        {/* Animated Background */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            ref={bgImageRef}
            className="relative w-full h-full"
          >
            <img
              src="/images/sprite_flicker.gif"
              alt="Winter Dinner - Flickering candlelight ambiance"
              className="absolute inset-0 w-full h-full object-contain"
              style={{
                imageRendering: 'crisp-edges'
              }}
            />
            <style>{`
              @media (max-width: 768px) {
                img[src="/images/sprite_flicker.gif"] {
                  width: 150% !important;
                  object-fit: cover !important;
                  object-position: left center !important;
                }
              }
            `}</style>

            {/* Background Coordinate System Overlay */}
            <div
              className="absolute inset-0"
              style={{
                pointerEvents: 'none',
              }}
            >

          {/* Place your positioned elements here using BgPositioned component */}
          <BgPositioned x={50} y={13}>
            <motion.h1
              className="font-light tracking-widest text-white/90 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md"
              style={{ fontFamily: "'Cardo', serif", maxWidth: '90vw' }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <div style={{ textAlign: 'center', lineHeight: '1.1' }}>
                <div style={{
                  display: 'block',
                  fontSize: 'clamp(1.4rem, 5.6vw, 2.45rem)',
                  fontWeight: 300,
                  whiteSpace: 'nowrap'
                }}>
                  WINTER DINNER
                </div>
              </div>
            </motion.h1>
          </BgPositioned>

          {/* Menu text */}
          <BgPositioned x={25} y={55}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              onClick={() => setIsMenuModalOpen(true)}
              className="text-white/70 font-light tracking-wide rounded-lg text-left bg-white/10 backdrop-blur-md cursor-pointer hover:bg-white/20 transition-colors"
              style={{
                fontFamily: "'Cardo', serif",
                maxWidth: '300px',
                padding: '6px 10px'
              }}
            >
              <div style={{ fontSize: '1rem', lineHeight: '1.6', width: '100%' }}>
                {[
                  { text: 'Apple beet juice', isTitle: true },
                  { text: '', isTitle: false },
                  { text: 'Carrot celery salad', isTitle: true },
                  { text: 'roasted carrot, celery seed,', isTitle: false },
                  { text: 'celery leaves', isTitle: false },
                  { text: '', isTitle: false },
                  { text: "Purple potato gnocchi", isTitle: true },
                  { text: "'cacio e pepe'", isTitle: false },
                  { text: '', isTitle: false },
                  { text: 'Trout and rice', isTitle: true },
                  { text: 'fresh trout roe, natto,', isTitle: false },
                  { text: 'daikon', isTitle: false },
                  { text: '', isTitle: false },
                  { text: 'Rack of lamb', isTitle: true },
                  { text: 'mint, focaccia', isTitle: false },
                  { text: 'breadcrumbs', isTitle: false },
                  { text: '', isTitle: false },
                  { text: 'Apple Malvern', isTitle: true },
                  { text: 'caramelized panela,', isTitle: false },
                  { text: 'currant', isTitle: false },
                  { text: '', isTitle: false },
                  { text: 'Cookie plate', isTitle: true },
                  { text: 'gingerbread, spritz,', isTitle: false },
                  { text: 'crinkle, cranberry thumb', isTitle: false }
                ].map((item, index) => (
                  item.text === '' ? (
                    <div key={index} style={{ height: '0.5rem' }} />
                  ) : item.isTitle ? (
                    <h3 key={index} style={{ display: 'block', marginBottom: '0.2rem', width: '100%', fontSize: '1.125rem', fontWeight: 400, fontFamily: "'Cardo', serif", color: '#FFB2B2', wordWrap: 'break-word' }}>
                      {item.text}
                    </h3>
                  ) : (
                    <div key={index} style={{ display: 'block', marginBottom: '0.2rem', width: '100%', wordWrap: 'break-word' }}>
                      {item.text}
                    </div>
                  )
                ))}
              </div>
            </motion.div>
          </BgPositioned>

          {/* Description text - Upper copy */}
          <BgPositioned x={60} y={38} className="!fixed !top-32 !right-1 !left-auto !translate-x-0 !translate-y-0 md:!absolute md:!top-[38%] md:!left-[60%] md:!right-auto md:!-translate-x-1/2 md:!-translate-y-1/2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
              className="font-light tracking-wider rounded-lg bg-white/10 backdrop-blur-md max-w-[138px] md:max-w-[230px]"
              style={{
                fontFamily: "'Cardo', serif",
                overflow: 'hidden',
                padding: '6px 10px'
              }}
            >
              <div className="text-sm md:text-base" style={{ lineHeight: '1.6', maxWidth: '100%', color: '#404040' }}>
                join us for a warm winter dinner on a cold winter night. our fanciest dinner, in the oldest barn we could find. price includes beverage pairing.
              </div>
            </motion.div>
          </BgPositioned>

          {/* Date/Time text - Lower copy */}
          <BgPositioned x={60} y={68}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
              className="text-white/60 font-light tracking-wider rounded-lg bg-white/10 backdrop-blur-md"
              style={{
                fontFamily: "'Cardo', serif",
                maxWidth: '230px',
                overflow: 'hidden',
                padding: '6px 10px'
              }}
            >
              <div style={{ fontSize: '1.125rem', lineHeight: '1.6', maxWidth: '100%' }}>
                <h3 style={{ display: 'block', marginBottom: '0.3rem', maxWidth: '100%', overflow: 'hidden', fontSize: '1.125rem', fontWeight: 400, fontFamily: "'Cardo', serif", color: '#FFB2B2' }}>
                  December 12, 2025
                </h3>
                <h3 style={{ display: 'block', marginBottom: '0.3rem', maxWidth: '100%', overflow: 'hidden', fontSize: '1.125rem', fontWeight: 400, fontFamily: "'Cardo', serif", color: '#FFB2B2' }}>
                  5:30 PM
                </h3>
                <h3 style={{ display: 'block', maxWidth: '100%', overflow: 'hidden', fontSize: '1.125rem', fontWeight: 400, fontFamily: "'Cardo', serif", color: '#FFB2B2' }}>
                  <a
                    href="https://rchs.com/gibbs-farm/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'underline' }}
                  >
                    Gibbs Farm
                  </a>
                </h3>
              </div>
            </motion.div>
          </BgPositioned>
            </div>
          </div>
        </div>


        {/* Call to Action Button */}
        <BgPositioned x={50} y={82} className="!fixed !bottom-4 !right-1 !left-auto !top-auto !translate-x-0 !translate-y-0 md:!absolute md:!top-[82%] md:!left-1/2 md:!bottom-auto md:!right-auto md:!-translate-x-1/2 md:!-translate-y-1/2">
          <motion.button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-3 md:px-12 md:py-6 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-lg text-white text-base md:text-2xl tracking-wider hover:bg-white/20 transition-all duration-300 shadow-2xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black max-w-[30vw] md:max-w-none"
            style={{ fontFamily: "'Special Gothic Expanded One', sans-serif", textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.8 }}
            aria-label="Purchase ticket for Winter Dinner - $75"
          >
            Attend Dinner
          </motion.button>
        </BgPositioned>

        {/* Registration Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <DinnerRegistrationModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Menu Modal */}
        <AnimatePresence>
          {isMenuModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-black/90 border-2 border-white/20 rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                style={{ fontFamily: "'Cardo', serif" }}
              >
                <button
                  onClick={() => setIsMenuModalOpen(false)}
                  className="absolute top-4 right-4 text-white/60 hover:text-white/90 text-3xl"
                  aria-label="Close menu"
                >
                  ×
                </button>
                <h2 className="text-3xl font-light tracking-wider mb-6 text-center" style={{ color: '#FFB2B2' }}>
                  Menu
                </h2>
                <div className="text-white/70 space-y-4">
                  {[
                    { text: 'Apple beet juice', isTitle: true },
                    { text: '', isTitle: false },
                    { text: 'Carrot celery salad', isTitle: true },
                    { text: 'roasted carrot, celery seed, celery leaves', isTitle: false },
                    { text: '', isTitle: false },
                    { text: "Purple potato gnocchi", isTitle: true },
                    { text: "'cacio e pepe'", isTitle: false },
                    { text: '', isTitle: false },
                    { text: 'Trout and rice', isTitle: true },
                    { text: 'fresh trout roe, natto, daikon', isTitle: false },
                    { text: '', isTitle: false },
                    { text: 'Rack of lamb', isTitle: true },
                    { text: 'mint, focaccia breadcrumbs', isTitle: false },
                    { text: '', isTitle: false },
                    { text: 'Apple Malvern', isTitle: true },
                    { text: 'caramelized panela, currant', isTitle: false },
                    { text: '', isTitle: false },
                    { text: 'Cookie plate', isTitle: true },
                    { text: 'gingerbread, spritz, crinkle, cranberry thumb', isTitle: false }
                  ].map((item, index) => (
                    item.text === '' ? (
                      <div key={index} style={{ height: '0.5rem' }} />
                    ) : item.isTitle ? (
                      <h3 key={index} className="text-xl font-normal" style={{ color: '#FFB2B2' }}>
                        {item.text}
                      </h3>
                    ) : (
                      <p key={index} className="text-base ml-4">
                        {item.text}
                      </p>
                    )
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default WinterDinnerPage;
