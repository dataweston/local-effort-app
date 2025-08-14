import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CostEstimator } from '../components/pricing/CostEstimator';

export const PricingPage = () => {
    const [openFaq, setOpenFaq] = useState(null);
    
    const pricingFaqData = [
        { 
            name: "How much does a weekly meal plan cost?", 
            answer: "Our weekly meal plans range from $13.50 for lighter breakfast options to $24 for full dinner meals." 
        }, 
        { 
            name: "What is the cost for a small event or party?", 
            answer: "A simple food drop-off service starts as low as $25 per person. Full-service events can range up to $85 per person or more." 
        }, 
        { 
            name: "How much does an intimate dinner at home cost?", 
            answer: "An intimate dinner at your home generally ranges from $65 to $125 per person." 
        }, 
        { 
            name: "How much is a private pizza party?", 
            answer: "Our private pizza parties start at $300 for groups of up to 15 people." 
        }
    ];

    return (
        <>
            <Helmet>
                <title>Pricing | Local Effort</title>
                <meta name="description" content="Find pricing information for Local Effort's personal chef services." />
            </Helmet>
            <div className="space-y-16">
                {/* Header */}
                <div className="animate-fade-in-up">
                    <h1 className="text-hero font-display">Pricing</h1>
                    <div className="w-24 h-1 bg-gradient-warm mt-4"></div>
                </div>

                {/* Introduction */}
                <p className="text-body-large max-w-4xl animate-fade-in-up stagger-1">
                    Use our estimator for a ballpark figure, or review our general pricing guidelines below.
                </p>

                {/* Cost Estimator Section */}
                <section className="animate-fade-in-up stagger-2">
                    <h2 className="text-heading font-display mb-8">Cost Estimator</h2>
                    <div className="card">
                        <div className="card-content">
                            <CostEstimator />
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="animate-fade-in-up stagger-3">
                    <h2 className="text-heading font-display mb-8">General Pricing FAQ</h2>
                    <div className="space-y-4">
                        {pricingFaqData.map((item, index) => (
                            <div 
                                key={index} 
                                className="card animate-fade-in-up"
                                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                            >
                                <button 
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                    className="w-full card-content flex justify-between items-center text-left hover:bg-secondary-cream transition-colors duration-300"
                                >
                                    <h3 className="text-subheading font-display pr-4">
                                        {item.name}
                                    </h3>
                                    <span 
                                        className={`transform transition-transform duration-300 text-2xl font-light ${
                                            openFaq === index ? 'rotate-45' : ''
                                        }`}
                                    >
                                        +
                                    </span>
                                </button>
                                
                                {openFaq === index && (
                                    <div className="card-content pt-0 animate-fade-in-up">
                                        <div className="border-t pt-6">
                                            <p className="text-body leading-relaxed">
                                                {item.answer}
                                            </p>
                                        </div>
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