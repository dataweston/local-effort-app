import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CostEstimator } from '../components/pricing/CostEstimator';

export const PricingPage = () => {
    const [openFaq, setOpenFaq] = useState(null);
    const pricingFaqData = [ { name: "How much does a weekly meal plan cost?", answer: "Our weekly meal plans range from $13.50 for lighter breakfast options to $24 for full dinner meals." }, { name: "What is the cost for a small event or party?", answer: "A simple food drop-off service starts as low as $25 per person. Full-service events can range up to $85 per person or more." }, { name: "How much does an intimate dinner at home cost?", answer: "An intimate dinner at your home generally ranges from $65 to $125 per person." }, { name: "How much is a private pizza party?", answer: "Our private pizza parties start at $300 for groups of up to 15 people." } ];
    return (
        <>
            <Helmet>
                <title>Pricing | Local Effort</title>
                <meta name="description" content="Find pricing information for Local Effort's personal chef services." />
            </Helmet>
            <div className="space-y-16">
                <h2 className="text-5xl md:text-7xl font-bold uppercase">Pricing</h2>
                <p className="font-mono text-lg max-w-3xl">Use our estimator for a ballpark figure, or review our general pricing guidelines below.</p>
                <section>
                    <h3 className="text-3xl font-bold uppercase mb-4">Cost Estimator</h3>
                    <CostEstimator />
                </section>
                <section>
                    <h3 className="text-3xl font-bold uppercase mb-4">General Pricing FAQ</h3>
                     <div className="space-y-px bg-gray-900 border border-gray-900">
                        {pricingFaqData.map((item, index) => (
                            <div key={index} className="bg-[#F5F5F5]">
                                <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full p-8 text-left flex justify-between items-center">
                                    <h3 className="text-2xl font-bold">{item.name}</h3>
                                    <span className={`transform transition-transform duration-300 text-3xl ${openFaq === index ? 'rotate-45' : ''}`}>+</span>
                                </button>
                                {openFaq === index && (
                                    <div className="p-8 pt-0">
                                        <p className="font-mono text-gray-700 border-t border-gray-300 pt-4">{item.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
};