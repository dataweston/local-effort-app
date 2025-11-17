import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import DinnerRegistrationModal from '../components/WinterDinner/DinnerRegistrationModal';
import { FuzzyText } from '../components/ui/fuzzy-text';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';

const WinterDinnerPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />

        {/* Google Fonts - Cardo & Special Gothic Expanded One */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&family=Special+Gothic+Expanded+One&display=swap" rel="stylesheet" />

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
        {/* Breadcrumb Navigation */}
        <nav
          className="absolute top-4 left-4 z-20"
          aria-label="Breadcrumb"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-white/60 hover:text-white/90 transition-colors duration-200 text-xs tracking-wide"
            aria-label="Return to home page"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
          >
            <Home size={12} />
            <span>Home</span>
          </Link>
        </nav>

        {/* Animated Background */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <img
            src="/images/sprite_flicker.gif"
            alt="Winter Dinner - Flickering candlelight ambiance"
            className="w-[120%] h-[120%] md:w-[110%] md:h-auto object-cover md:object-contain"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 flex flex-col items-center gap-8 mt-[25vh]">
          {/* Event Details with Fuzzy Text */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-light tracking-widest text-white/90" style={{ fontFamily: "'Cardo', serif", textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              <FuzzyText
                text="WINTER DINNER"
                className="inline-block"
                duration={40}
                iterations={2}
              />
            </h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              className="text-white/70 text-lg md:text-xl font-light tracking-wide"
              style={{ fontFamily: "'Cardo', serif", textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}
            >
              <FuzzyText
                text="December 21, 2025 • 6:00 PM"
                className="inline-block"
                duration={30}
                iterations={1}
              />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
              className="text-white/60 text-sm md:text-base font-light tracking-wider max-w-md mx-auto"
              style={{ fontFamily: "'Cardo', serif", textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
            >
              An intimate multi-course dining experience
            </motion.p>
          </motion.div>

          {/* Call to Action Button */}
          <motion.button
            onClick={() => setIsModalOpen(true)}
            className="px-12 py-6 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-lg text-white text-2xl tracking-wider hover:bg-white/20 transition-all duration-300 shadow-2xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
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
        </div>

        {/* Registration Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <DinnerRegistrationModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default WinterDinnerPage;
