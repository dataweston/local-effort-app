import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ServiceCard from '../components/common/ServiceCard';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { fadeInUp, fadeInLeft } from '../utils/animations';
import { PizzaSVG } from '../components/crowdfunding/PizzaSVG';
import CloudinaryImage from '../components/common/cloudinaryImage'; // Import the new component

const HomePage = () => {
  const navigate = useNavigate();
  const goal = 1000;
  const filled = 327; // fetch this dynamically if possible

  // Animate pizza count-up
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  React.useEffect(() => {
    const controls = animate(count, filled, { duration: 2, ease: 'easeOut' });
    return controls.stop;
  }, [filled]);

  // --- NEW: Define image data for both the component and structured data ---
  const heroImage = {
    publicId: 'gallery/IMG_3145', // The public ID from Cloudinary
    alt: 'A beautifully plated dish with microgreens and edible flowers',
    // You must replace 'your-cloud-name' with your actual Cloudinary cloud name
    url: 'https://res.cloudinary.com/your-cloud-name/image/upload/v1/gallery/IMG_3145.jpg'
  };

  // --- NEW: Define the JSON-LD structured data object for SEO ---
  const imageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "contentUrl": heroImage.url,
    "name": heroImage.alt,
    "description": "A sample of the professional in-home dining experience by Local Effort.",
    "creator": {
      "@type": "Organization",
      "name": "Local Effort"
    }
  };

  return (
    <>
      <Helmet>
        <title>Local Effort | Personal Chef & Event Catering in Roseville, MN</title>
        <meta name="description" content="Local Effort offers personal chef services, event catering, and weekly meal prep in Roseville, MN." />
        {/* --- NEW: Inject the structured data into the page head --- */}
        <script type="application/ld+json">
          {JSON.stringify(imageJsonLd)}
        </script>
      </Helmet>

      <div className="space-y-24">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 items-center min-h-[60vh]">
          <div>
            <motion.h2 variants={fadeInLeft} initial="initial" animate="animate" className="text-hero uppercase">
              Minnesotan Food
            </motion.h2>
            <motion.h3 variants={fadeInLeft} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="text-hero uppercase text-neutral-400">
              For Your Functions.
            </motion.h3>
            <motion.p variants={fadeInUp} initial="initial" animate="animate" className="mt-8 text-body max-w-md">
              Professional in-home dining. 30 years collective fine food experience. Sourcing the best local ingredients without compromise.
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

        {/* Pizza Tracker */}
        <section className="bg-neutral-50 py-16">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <h3 className="text-heading uppercase">Our Goal: 1000 Pizzas</h3>
            <div className="flex justify-center">
              <PizzaSVG size={300} goal={goal} filled={filled} />
            </div>
            <motion.div className="text-4xl font-bold">
              {rounded}
            </motion.div>
            <p className="text-neutral-600">Pizzas sold towards our fundraiser</p>
          </div>
        </section>

        {/* Offerings */}
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <h3 className="text-heading uppercase mb-6 border-b border-neutral-300 pb-3">Core Offerings</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <ServiceCard to="/meal-prep" title="Weekly Meal Prep" description="Foundation & custom plans. Basic, good nutrition from local Midwest sources." />
            <ServiceCard to="/events" title="Dinners & Events" description="Event catering and in-home chef experiences, for parties of 2 to 50." />
            <ServiceCard to="/pizza-party" title="Pizza Parties" description="Mobile high-temperature pizza oven, sourdough crusts, and all local ingredients." />
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;
