// src/pages/PricingPage.js
import React, { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { CostEstimator } from "../components/pricing/CostEstimator";
import { motion } from "framer-motion";

const PricingPage = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const faqRefs = useRef([]);

  const pricingFaqData = [
    {
      name: "How much does a weekly meal plan cost?",
      answer:
        "Our weekly meal plans range from $13.50 for lighter breakfast options to $24 for full dinner meals.",
    },
    {
      name: "What is the cost for a small event or party?",
      answer:
        "A simple food drop-off service starts as low as $25 per person. Full-service events can range up to $85 per person or more.",
    },
    {
      name: "How much does an intimate dinner at home cost?",
      answer: "An intimate dinner at your home generally ranges from $65 to $125 per person.",
    },
    {
      name: "How much is a private pizza party?",
      answer: "Our private pizza parties start at $300 for groups of up to 15 people.",
    },
  ];

  // Scroll to opened FAQ on change
  useEffect(() => {
    if (openFaq !== null && faqRefs.current[openFaq]) {
      faqRefs.current[openFaq].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [openFaq]);

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
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            Use our estimator for a ballpark figure, or review our general pricing
            guidelines below.
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

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-2xl font-bold uppercase mb-4">General Pricing FAQ</h3>

          <div className="space-y-2">
            {pricingFaqData.map((item, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  key={index}
                  ref={(el) => (faqRefs.current[index] = el)}
                  className="bg-[#F5F5F5] border border-gray-300 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-6 text-left flex justify-between items-center"
                  >
                    <h3 className="text-xl font-semibold">{item.name}</h3>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="text-3xl"
                    >
                      +
                    </motion.span>
                  </button>

                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden px-6 pt-0 pb-6 border-t border-gray-300"
                  >
                    <p className="text-gray-700 text-base">{item.answer}</p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </>
  );
};

export default PricingPage;
