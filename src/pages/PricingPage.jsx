// src/pages/PricingPage.js
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { CostEstimator } from '../components/pricing/CostEstimator';
import { motion } from 'framer-motion';
import pricingFaq from '../data/pricingFaq.json';

const PricingPage = () => {
  // FAQ temporarily hidden; state removed

  const faqEntities = pricingFaq.map((item) => ({
    '@type': 'Question',
    name: item.name,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  }));

  return (
    <>
      <Helmet>
        <title>How Much Does a Personal Chef Cost? | Minneapolis Personal Chef Pricing — Local Effort</title>
        <meta
          name="description"
          content="How much does a personal chef cost? See Minneapolis–St. Paul price ranges for in-home dinners, weekly meal prep, and small events. Use our estimator for a quick ballpark."
        />
        <link rel="canonical" href="https://localeffortfood.com/pricing" />
        <meta name="robots" content="index,follow" />
        <meta
          name="keywords"
          content="how much does a personal chef cost, personal chef cost Minneapolis, private chef cost, personal chef pricing, cost of personal chef per person, weekly meal prep cost, private chef Minneapolis pricing"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://localeffortfood.com/pricing" />
        <meta property="og:title" content="How Much Does a Personal Chef Cost? Minneapolis Personal Chef Pricing — Local Effort" />
        <meta property="og:description" content="See typical costs for personal chefs in Minneapolis–St. Paul: in-home dinners, weekly meal prep, and small events. Try the estimator for a quick ballpark." />
        <meta property="og:image" content="/gallery/logo.png?text=Local+Effort&font=mono" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="How Much Does a Personal Chef Cost? Minneapolis Personal Chef Pricing — Local Effort" />
        <meta name="twitter:description" content="See typical personal chef costs in Minneapolis–St. Paul and use our estimator to get a quick ballpark for your event or weekly meals." />
        <meta name="twitter:image" content="/gallery/logo.png?text=Local+Effort&font=mono" />
        <script
          type="application/ld+json"
        >{JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqEntities })}</script>
      </Helmet>

      <div className="space-y-16 max-w-5xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <h1 className="heading-display heading-balance">
            Personal chef pricing, simplified.
          </h1>
          <p className="heading-subtitle text-neutral-600 max-w-3xl mx-auto">
            It’s not as expensive as you think.
          </p>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            We tailor pricing closely to your needs. We try to stay competitive to an evening at a nice restaurant, (or to the price of takeout, depending on the request). Oftentimes, we're the much better deal.
          </p>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto mt-4">
            Minneapolis personal chef pricing typically ranges from $95 to $135 per guest for intimate dinners. Weekly meal prep Minneapolis plans start near $325 for 12 meals, while custom meal plan Minneapolis subscriptions scale with portions, delivery cadence, and dietary requests.
          </p>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto mt-4">
            Below is a handy tool that can take some of the mystery out. We'll finalize the actual price <a href="/services#event-request" className="underline">together</a>.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="heading-xl heading-underline">Cost estimator</h2>
          <CostEstimator />
        </motion.section>

        <motion.section
          id="pricing-faq"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <h2 className="heading-xl heading-underline">Personal chef pricing FAQ</h2>
          <p className="text-gray-700">
            Wondering how much a personal chef costs in Minneapolis? These quick answers summarize what most households and event planners invest for chef-prepared menus, staffing, and meal prep support.
          </p>
          <div className="space-y-6">
            {pricingFaq.map((item) => (
              <div key={item.name} className="border border-gray-200 rounded-lg p-6">
                <h4 className="text-xl font-semibold">{item.name}</h4>
                <p className="text-gray-700 mt-2">{item.answer}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </>
  );
};

export default PricingPage;
