import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ServiceCard from '../components/common/ServiceCard';
import { motion } from 'framer-motion';
import { fadeInUp, fadeInLeft } from '../utils/animations';
import CloudinaryImage from '../components/common/cloudinaryImage'; // Import the Cloudinary image component
import sanityClient from '../sanityClient.js';
import { useEffect, useState } from 'react';

const HomePage = () => {
  const navigate = useNavigate();
  // (removed pizza tracker) — fetch dynamic stats from backend or Sanity if desired

  const [partners, setPartners] = useState([]);

  useEffect(() => {
    let mounted = true;
    const q = `*[_type == "partner" && published == true] | order(order asc){ name, "publicId": logo.publicId, "image": logo.asset, url }`;
    sanityClient
      .fetch(q)
      .then((res) => {
        if (mounted && res && res.length) setPartners(res);
      })
      .catch((err) => {
        console.warn('Failed to fetch partners from Sanity, falling back to static list:', err.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const PartnerGrid = () => {
    const items = partners.length
      ? partners
      : [
          { publicId: 'gallery/logo.png', name: 'Local Effort' },
          { publicId: 'gallery/logo_sticker.png', name: 'Sticker' },
          { publicId: 'gallery/C6460B50-A88D-4C61-A6AA-9C460373DF29.JPG', name: 'Partner A' },
        ];

    return (
      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 items-center px-4">
        {items.map((p, i) => (
          <a
            key={(p.publicId || (p.image && p.image._ref) || i) + i}
            href={p.url || '#'}
            onClick={(e) => {
              if (!p.url) e.preventDefault();
              if (window && window.gtag) {
                window.gtag('event', 'partner_click', { partner: p.name || p.publicId });
              } else {
                console.log('partner_click', p.name || p.publicId);
              }
            }}
            className="flex items-center justify-center p-4 bg-white rounded-lg shadow-sm"
            aria-label={p.name || `Partner ${i + 1}`}
            rel="noopener noreferrer"
            target={p.url ? '_blank' : undefined}
          >
            <CloudinaryImage
              publicId={p.publicId}
              alt={p.name || `Partner ${i + 1}`}
              width={300}
              height={80}
              className="max-h-16 object-contain grayscale hover:grayscale-0 transition-all"
            />
          </a>
        ))}
      </div>
    );
  };

  // --- NEW: Define image data for both the component and structured data ---
  const heroImage = {
    publicId: 'gallery/IMG_3145',
    alt: 'A beautifully plated dish with microgreens and edible flowers',
  };

  // --- NEW: Define the JSON-LD structured data object for SEO ---
  const imageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: `https://res.cloudinary.com/${import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/v1/${heroImage.publicId}.jpg`,
    name: heroImage.alt,
    description: 'A sample of the professional in-home dining experience by Local Effort.',
    creator: {
      '@type': 'Organization',
      name: 'Local Effort',
    },
  };

  return (
    <>
      <Helmet>
        <title>Local Effort | Personal Chef & Event Catering in Roseville, MN</title>
        <meta
          name="description"
          content="Local Effort offers personal chef services, event catering, and weekly meal prep in Roseville, MN."
        />
        {/* --- NEW: Inject the structured data into the page head --- */}
        <script type="application/ld+json">{JSON.stringify(imageJsonLd)}</script>
      </Helmet>

      <div className="space-y-24">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 items-center min-h-[60vh]">
          <div>
            <motion.h2
              variants={fadeInLeft}
              initial="initial"
              animate="animate"
              className="text-hero uppercase"
            >
              Minnesotan Food
            </motion.h2>
            <motion.h3
              variants={fadeInLeft}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05 }}
              className="text-hero uppercase text-neutral-400"
            >
              For Your Functions.
            </motion.h3>
            <motion.p
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="mt-8 text-body max-w-md"
            >
              Professional in-home dining. 30 years collective fine food experience. Sourcing the
              best local ingredients without compromise.
            </motion.p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/services')}
              className="btn btn-primary mt-8 text-lg"
            >
              Explore Services
            </motion.button>
          </div>

          <motion.div
            className="w-full min-h-[400px] h-full rounded-xl overflow-hidden" // Added overflow-hidden
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* --- REPLACED: The old div is replaced with the CloudinaryImage component --- */}
            <CloudinaryImage
              publicId={heroImage.publicId}
              alt={heroImage.alt}
              width={600}
              height={600}
              className="w-full h-full object-cover" // Ensure it fills the container
            />
          </motion.div>
        </section>

        {/* Partner / Logo Wall */}
        <section className="py-12">
          <h3 className="text-heading uppercase text-center mb-4">Our Partners</h3>
          <p className="text-center text-sm text-gray-600 max-w-2xl mx-auto mb-6">
            Proud partners who help make this project possible. Support local — shop and
            collaborate with them.
          </p>

          <PartnerGrid />
        </section>

        {/* Offerings */}
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <h3 className="text-heading uppercase mb-6 border-b border-neutral-300 pb-3">
            Core Offerings
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <ServiceCard
              to="/meal-prep"
              title="Weekly Meal Prep"
              description="Foundation & custom plans. Basic, good nutrition from local Midwest sources."
            />
            <ServiceCard
              to="/events"
              title="Dinners & Events"
              description="Event catering and in-home chef experiences, for parties of 2 to 50."
            />
            <ServiceCard
              to="/pizza-party"
              title="Pizza Parties"
              description="Mobile high-temperature pizza oven, sourdough crusts, and all local ingredients."
            />
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;
