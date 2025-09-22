// src/pages/PricingPage.js
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { CostEstimator } from '../components/pricing/CostEstimator';
import { motion } from 'framer-motion';

const PricingPage = () => {
  // FAQ temporarily hidden; state removed

  return (
    <>
      <Helmet>
        <title>Pricing | Local Effort</title>
        <meta
          name="description"
          content="Find pricing information for Local Effort's personal chef services."
        />
      </Helmet>

      <div className="space-y-16 max-w-5xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-4xl font-extrabold uppercase mb-4">Pricing</h2>
          <h3 className="text-2xl font-semibold mb-2">It’s not as expensive as you think.</h3>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            If you’re picturing a white tablecloth dinner with a dozen staff at $200 per person, that’s not us. Most of our work is done by one to three people, with pricing and menus that reflect that. We’re customized and flexible for a reason — so that we can deliver a great experience without a lot of fuss or cost.
          </p>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto mt-4">
            As a general rule, assume you’ll pay about 20–30% more than a restaurant equivalent with the same ingredient quality, depending on event complexity and your needs. If you want an exact quote, reach out with the details of your event and we’ll get back with a simple, transparent price.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-2xl font-bold uppercase mb-4">Cost Estimator</h3>
          <CostEstimator />
        </motion.section>

        {/* FAQ hidden for now per request */}
      </div>
    </>
  );
};

export default PricingPage;
