// ...existing code...
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { PortableText } from '@portabletext/react';
import imageUrlBuilder from '@sanity/image-url';
import sanityClient from '../sanityClient.js';

// --- Sanity Image URL Builder Setup ---
const builder = imageUrlBuilder(sanityClient);
function urlFor(source) {
    return builder.image(source);
}

// --- Helper & Child Components (No changes needed here) ---
const StatBox = ({ value, label }) => (
    <div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-gray-600">{label}</p>
    </div>
);

const RewardTierCard = ({ tier }) => {
    // 💡 IMPROVEMENT: Handle cases where a referenced reward tier might have been deleted.
    if (!tier) {
        return null;
    }

    // Display pizza count when available, otherwise fall back to legacy dollar amount
    const pizzaCountLabel = tier.pizzaCount ? `${tier.pizzaCount.toLocaleString()} pizzas` : null;
    const moneyLabel = tier.amount ? `$${tier.amount.toLocaleString()}` : null;

    return (
        <div className="card p-6 border hover:border-[var(--color-accent)] transition-colors">
            <p className="text-2xl font-bold">
                {pizzaCountLabel ? `${pizzaCountLabel} — ${tier.title}` : `Pledge ${moneyLabel || '$0'} or more`}
            </p>
            {!pizzaCountLabel && <h4 className="text-xl font-bold text-[var(--color-accent)] mt-1">{tier.title}</h4>}
            <p className="text-body text-gray-600 my-3">{tier.description}</p>
            {tier.limit && <p className="text-sm font-semibold text-gray-500 mb-3">LIMITED ({tier.limit} left)</p>}
            <button className="btn btn-secondary w-full">Select this reward</button>
        </div>
    );
};
// ...existing code...


// --- Main Page Component ---
const CrowdfundingPage = () => {
    const [campaignData, setCampaignData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // 💡 IMPROVEMENT: Add error state
    const [activeTab, setActiveTab] = useState('story');

    useEffect(() => {
        // 💡 IMPROVEMENT: Fetch a specific campaign by its slug for a more robust component.
        // For this example, we'll hardcode a slug. In a real app, you'd get this from the URL.
        const slug = "local-pizza-by-local-effort-let-s-make-1000-pizzas"; // Replace with a real slug from your Sanity data
        const query = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{
            title,
            description,
            // pizza-specific fields (keep legacy fields for backwards compatibility)
            pizzaGoal,
            pizzasSold,
            goal,
            raisedAmount,
            backers,
            endDate,
            heroImage,
            story,
            faq,
            "rewardTiers": rewardTiers[]->{ amount, pizzaCount, title, description, limit } | order(amount asc),
            "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)
        }`;
        
        const params = { slug };

        sanityClient.fetch(query, params)
            .then((data) => {
                setCampaignData(data);
            })
            .catch(err => {
                console.error('Sanity fetch error:', err);
                setError('Failed to load campaign data.'); // Set error state
            })
            .finally(() => {
                setLoading(false); // Ensure loading is always set to false
            });
    }, []);

    if (loading) {
        return <div className="text-center p-12">Loading campaign...</div>;
    }

    if (error) {
        return <div className="text-center p-12 text-red-600">{error}</div>;
    }

    if (!campaignData) {
        return <div className="text-center p-12">No campaign found. Have you created and published it in Sanity Studio?</div>;
    }

    // --- ✅ FIX: More robust default values ---
    // This handles both `undefined` and `null` cases by using the `||` operator.
    const {
        title = 'Untitled Campaign',
        description = '',
        goal = 0,
        raisedAmount = 0,
        backers = 0,
        endDate = null,
        heroImage = null,
    } = campaignData;

    // Specifically safeguard array types to prevent the .length error
    const story = campaignData.story || [];
    const faq = campaignData.faq || [];
    const rewardTiers = campaignData.rewardTiers || [];
    const updates = campaignData.updates || [];


    // --- Pizza-specific values (prefer pizza fields, fallback to legacy money values) ---
    const pizzasSold = (campaignData.pizzasSold ?? campaignData.raisedAmount) || 0;
    const pizzaGoal = (campaignData.pizzaGoal ?? campaignData.goal) || 1000; // default goal to 1000 pizzas
    const daysLeft = endDate ? Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
    const progressPercentage = pizzaGoal > 0 ? Math.min((pizzasSold / pizzaGoal) * 100, 100) : 0;


    const TabButton = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`pb-2 px-1 text-lg font-semibold transition-colors ${activeTab === tabName
                ? 'border-b-2 border-[var(--color-accent)] text-gray-900'
                : 'text-gray-500 hover:text-gray-800'
                }`}
        >
            {label}
        </button>
    );

    return (
        <>
            <Helmet>
                <title>{`${title} | Crowdfunding Campaign`}</title>
                <meta name="description" content={description} />
            </Helmet>

            <div className="space-y-12">
                {/* --- Page Header --- */}
                <div>
                    <h1 className="text-hero uppercase">{title}</h1>
                    <p className="text-body max-w-3xl mt-2">{description}</p>
                </div>

                {/* --- Main Content Grid --- */}
                <div className="grid grid-cols-1 lg:grid-cols-5 lg:gap-16">
                    {/* --- Left Column (Media & Content Tabs) --- */}
                    <div className="lg:col-span-3 space-y-8">
                        {heroImage && (
                            <img
                                src={urlFor(heroImage).width(1200).quality(80).url()}
                                alt={title}
                                className="w-full object-cover rounded-lg aspect-video bg-gray-100"
                            />
                        )}

                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-8">
                                <TabButton tabName="story" label="Story" />
                                {updates.length > 0 && <TabButton tabName="updates" label={`Updates (${updates.length})`} />}
                                {faq.length > 0 && <TabButton tabName="faq" label="FAQ" />}
                            </nav>
                        </div>
                        <div className="prose max-w-none text-body">
                            {activeTab === 'story' && story.length > 0 && <PortableText value={story} />}
                            {activeTab === 'updates' && (
                                <div className="space-y-8">
                                    {updates.map((update, index) => (
                                        <div key={index} className="p-4 border-l-4 border-gray-200">
                                            <h3 className="text-heading mt-0">{update.title}</h3>
                                            {/* 💡 IMPROVEMENT: Better date formatting */}
                                            <p className="text-sm text-gray-500 mb-2">{new Date(update.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            <PortableText value={update.body} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'faq' && (
                                <div className="space-y-6">
                                    {faq.map((item, index) => (
                                        <div key={index}>
                                            <h4 className="font-bold text-lg mb-1">{item.question}</h4>
                                            <p className="mt-0">{item.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- Right Column (Stats & Rewards) --- */}
                    <div className="lg:col-span-2 space-y-8 mt-12 lg:mt-0">
                        <div className="card p-6 space-y-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-[var(--color-accent)] h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                            </div>
                            <div>
                                <p className="text-4xl font-bold text-[var(--color-accent)]">{pizzasSold.toLocaleString()} pizzas</p>
                                <p className="text-body text-gray-600">sold of {pizzaGoal.toLocaleString()} pizzas goal</p>
                            </div>
                            <div className="flex justify-between text-body text-center border-y py-3">
                                <StatBox value={backers.toLocaleString()} label="backers" />
                                <StatBox value={daysLeft > 0 ? daysLeft : 'Ended'} label={daysLeft > 0 ? 'days to go' : ''} />
                            </div>
                            <button className="btn btn-primary w-full text-lg py-3">
                                Order a pizza
                            </button>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-heading uppercase">Support Us</h3>
                            {rewardTiers.map((tier) => (
                                <RewardTierCard key={tier?.title || Math.random()} tier={tier} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CrowdfundingPage;