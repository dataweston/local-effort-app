import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import sanityClient from '../client.js'; // Adjust the path if needed

// Helper component for social sharing icons (remains the same)
const ShareIcon = ({ children }) => (
    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors">
        {children}
    </div>
);

 const CrowdfundingPage = () => {
    const [campaignData, setCampaignData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // The GROQ query to fetch the campaign data
        const query = `*[_type == "crowdfundingCampaign"][0]{
            title,
            description,
            goal,
            raisedAmount,
            backers,
            endDate,
            "heroImageUrl": heroImage.asset->url,
            story,
            rewardTiers[]->{
                amount,
                title,
                description
            }
        }`;

        sanityClient.fetch(query)
            .then((data) => {
                setCampaignData(data);
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    if (loading) {
        return <div>Loading...</div>; // Or a more sophisticated loading spinner
    }

    if (!campaignData) {
        return <div>No campaign found.</div>;
    }
    
    // Calculate days left from the endDate
    const daysLeft = Math.ceil((new Date(campaignData.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    const progressPercentage = Math.min((campaignData.raisedAmount / campaignData.goal) * 100, 100);

    return (
        <>
            <Helmet>
                <title>{campaignData.title || 'Fund Our Next Step'} | Local Effort</title>
                <meta name="description" content={campaignData.description || 'Help Local Effort expand!'} />
            </Helmet>

            <div className="space-y-12">
                {/* --- Page Header --- */}
                <div>
                    <h2 className="text-hero uppercase">{campaignData.title}</h2>
                    <p className="text-body max-w-3xl mt-2">{campaignData.description}</p>
                </div>

                {/* --- Main Content Grid --- */}
                <div className="grid grid-cols-1 lg:grid-cols-5 lg:gap-16">

                    {/* --- Left Column (Story & Details) --- */}
                    <div className="lg:col-span-3 space-y-8">
                        {campaignData.heroImageUrl && (
                             <img src={campaignData.heroImageUrl} alt={campaignData.title} className="w-full object-cover rounded-lg aspect-video" />
                        )}
                        <div className="prose max-w-none text-body text-gray-800">
                             <h3 className="text-heading uppercase border-b border-gray-300 pb-2 mb-4">About This Project</h3>
                             {/* Note: You'll need a library like @portabletext/react to render the 'story' block content properly */}
                             <p><em>Content from Sanity for the story will go here.</em></p>
                        </div>
                    </div>

                    {/* --- Right Column (Stats & Rewards) --- */}
                    <div className="lg:col-span-2 space-y-8 mt-12 lg:mt-0">
                        {/* --- Progress Card --- */}
                        <div className="card p-6 space-y-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-[var(--color-accent)] h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                            </div>
                            <div>
                                <p className="text-4xl font-bold text-[var(--color-accent)]">${campaignData.raisedAmount.toLocaleString()}</p>
                                <p className="text-body text-gray-600">pledged of ${campaignData.goal.toLocaleString()} goal</p>
                            </div>
                            <div className="flex justify-between text-body text-center border-y py-3">
                                <div>
                                    <p className="text-3xl font-bold">{campaignData.backers}</p>
                                    <p className="text-gray-600">backers</p>
                                </div>
                                 <div>
                                    <p className="text-3xl font-bold">{daysLeft > 0 ? daysLeft : 'Ended'}</p>
                                    <p className="text-gray-600">{daysLeft > 0 ? 'days to go' : ''}</p>
                                </div>
                            </div>
                            <button className="btn btn-primary w-full text-lg py-3">
                                Back this project
                            </button>
                             <div className="flex justify-center items-center pt-2 space-x-3">
                               <p className="text-body text-sm text-gray-500">Share:</p>
                               <ShareIcon>FB</ShareIcon>
                               <ShareIcon>TW</ShareIcon>
                               <ShareIcon>LI</ShareIcon>
                            </div>
                        </div>

                        {/* --- Rewards Tiers --- */}
                        <div className="space-y-4">
                            <h3 className="text-heading uppercase">Support Us</h3>
                            {campaignData.rewardTiers?.map((tier) => (
                                <div key={tier.amount} className="card p-6">
                                    <p className="text-2xl font-bold">Pledge ${tier.amount} or more</p>
                                    <h4 className="text-xl font-bold text-[var(--color-accent)] mt-1">{tier.title}</h4>
                                    <p className="text-body text-gray-600 my-3">{tier.description}</p>
                                    <button 
                                        className="w-full bg-gray-800 text-white font-bold py-2 rounded-md hover:bg-gray-900 transition-colors"
                                    >
                                        Select this reward
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
export default CrowdfundingPage;
