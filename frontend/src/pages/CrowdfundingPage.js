import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';

// Helper component for social sharing icons
const ShareIcon = ({ children }) => (
    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors">
        {children}
    </div>
);

export const CrowdfundingPage = () => {
    // --- State for the Campaign ---
    const goal = 5000;
    const [raised, setRaised] = useState(2734);
    const [backers, setBackers] = useState(58);
    const daysLeft = 12;

    // --- Data for Reward Tiers ---
    const rewardTiers = [
        {
            amount: 10,
            title: "Supporter's Nod",
            description: "Receive a personal thank-you email from our founder and get your name on our digital supporters' wall.",
        },
        {
            amount: 50,
            title: "Pizza Party Kit",
            description: "Everything you need to make our signature pizza at home! Includes our fresh dough, San Marzano tomato sauce, and premium mozzarella.",
        },
        {
            amount: 125,
            title: "Private Cooking Class",
            description: "A 90-minute virtual cooking class for you and a friend, teaching the secrets behind one of our most popular dishes.",
        },
        {
            amount: 500,
            title: "Catered Dinner for Four",
            description: "We'll cater a full, three-course meal for you and three guests at your home. (Limited to within 30 miles of our kitchen).",
        }
    ];

    // --- Function to Handle Pledges ---
    const handlePledge = (amount) => {
        setRaised(currentRaised => currentRaised + amount);
        setBackers(currentBackers => currentBackers + 1);
        // In a real app, this would also handle payment processing
    };

    const progressPercentage = Math.min((raised / goal) * 100, 100);

    return (
        <>
            <Helmet>
                <title>Fund Our Next Step | Local Effort</title>
                <meta name="description" content="Help Local Effort expand our community kitchen and bring more delicious, local food to our neighbors." />
            </Helmet>

            <div className="space-y-12">
                {/* --- Page Header --- */}
                <div>
                    <h2 className="text-4xl md:text-6xl font-bold uppercase">Help Us Build a Better Kitchen</h2>
                    <p className="font-mono text-lg max-w-3xl mt-2">Our goal is to upgrade our equipment to serve more people in the community. Your support can make it happen.</p>
                </div>

                {/* --- Main Content Grid --- */}
                <div className="grid grid-cols-1 lg:grid-cols-5 lg:gap-16">

                    {/* --- Left Column (Story & Details) --- */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="bg-gray-200 aspect-video rounded-lg flex items-center justify-center">
                            <span className="font-mono text-gray-500">[Campaign Video or Hero Image]</span>
                        </div>
                        <div className="prose max-w-none font-mono text-gray-800">
                             <h3 className="text-2xl font-bold uppercase border-b border-gray-300 pb-2 mb-4">About This Project</h3>
                            <p>Local Effort started with a simple idea: food tastes better when it's made with love and shared with neighbors. For three years, we've been catering events, hosting pop-ups, and delivering meal plans, all from our small but mighty kitchen.</p>
                            <p>But we've reached our limit. To keep up with demand and to start our new "Community Meal" initiative, we need to upgrade. This campaign will fund a new commercial-grade oven, a larger walk-in refrigerator, and three new prep stations.</p>
                            <h3 className="text-2xl font-bold uppercase border-b border-gray-300 pb-2 my-4">Our Vision for the Future</h3>
                            <p>This isn't just about equipment; it's about building a more resilient local food system. With this new capacity, we can purchase more from local farmers, reduce food waste, and make our services more affordable for everyone. Your contribution is an investment in a tastier, more connected community.</p>
                        </div>
                    </div>

                    {/* --- Right Column (Stats & Rewards) --- */}
                    <div className="lg:col-span-2 space-y-8 mt-12 lg:mt-0">
                        {/* --- Progress Card --- */}
                        <div className="border rounded-lg p-6 space-y-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-[#f35c2b] h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                            </div>
                            <div>
                                <p className="text-4xl font-bold text-[#f35c2b]">${raised.toLocaleString()}</p>
                                <p className="font-mono text-gray-600">pledged of ${goal.toLocaleString()} goal</p>
                            </div>
                            <div className="flex justify-between font-mono text-center border-y py-3">
                                <div>
                                    <p className="text-3xl font-bold">{backers}</p>
                                    <p className="text-gray-600">backers</p>
                                </div>
                                 <div>
                                    <p className="text-3xl font-bold">{daysLeft}</p>
                                    <p className="text-gray-600">days to go</p>
                                </div>
                            </div>
                            <button className="w-full bg-[#f35c2b] text-white font-bold text-lg py-3 rounded-md hover:bg-[#e14f21] transition-colors">
                                Back this project
                            </button>
                             <div className="flex justify-center items-center pt-2 space-x-3">
                               <p className="font-mono text-sm text-gray-500">Share:</p>
                               <ShareIcon>FB</ShareIcon>
                               <ShareIcon>TW</ShareIcon>
                               <ShareIcon>LI</ShareIcon>
                            </div>
                        </div>

                        {/* --- Rewards Tiers --- */}
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold uppercase">Support Us</h3>
                            {rewardTiers.map((tier) => (
                                <div key={tier.amount} className="border rounded-lg p-6">
                                    <p className="text-2xl font-bold">Pledge ${tier.amount} or more</p>
                                    <h4 className="text-xl font-bold text-[#f35c2b] mt-1">{tier.title}</h4>
                                    <p className="font-mono text-gray-600 my-3">{tier.description}</p>
                                    <button 
                                        onClick={() => handlePledge(tier.amount)}
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