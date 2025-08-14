import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';

export const AboutUsPage = () => {
    const specialSkills = [
        { name: "Sourdough & Baking", description: "Natural leavening is a passion. We maintain our own sourdough starter and bake all our bread products in-house using local flours." },
        { name: "Fresh Pasta", description: "From agnolotti to tajarin, all our pasta is handmade, often using specialty flours and local eggs." },
        { name: "Charcuterie & Curing", description: "We practice whole-animal butchery and cure our own meats, from duck prosciutto to pork pate, ensuring quality and minimizing waste." },
        { name: "Foraging", description: "When the season allows, we forage for wild ingredients like ramps, mushrooms, and berries to bring a unique taste of Minnesota to the plate." },
        { name: "Fermentation", description: "We use fermentation to create unique flavors and preserve the harvest, making everything from hot sauce to kombucha." }
    ];
    const [activeSkill, setActiveSkill] = useState(specialSkills[0]);
    return (
        <>
            <Helmet>
                <title>About Us | Local Effort</title>
                <meta name="description" content="Meet the chefs behind Local Effort, Weston Smith and Catherine Olsen." />
            </Helmet>
            <div className="space-y-16">
                <h2 className="text-5xl md:text-7xl font-bold uppercase border-b border-gray-900 pb-4">About Us</h2>
                <p className="font-mono text-lg max-w-3xl">With 30 years of collective experience, we are passionate about food and hospitality. We believe in quality, handmade products and sourcing the best local ingredients without compromise.</p>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="border border-gray-900 p-8">
                        <h3 className="text-3xl font-bold">Weston Smith</h3>
                        <img src="/gallery/IMG-1013.JPG?text=Weston+Smith" alt="Weston Smith" className="my-4" />
                        <p className="font-mono text-gray-600 mb-4">Chef de Cuisine, Director</p>
                        <p className="font-mono">California-born and New York-trained, Weston is in charge of baking our sourdough bread and creating the menus.</p>
                    </div>
                    <div className="border border-gray-900 p-8">
                        <h3 className="text-3xl font-bold">Catherine Olsen</h3>
                        <img src="/gallery/IMG-6353.JPG?text=Catherine+Olsen" alt="Catherine Olsen" className="my-4" />
                        <p className="font-mono text-gray-600 mb-4">Pastry, General Manager</p>
                        <p className="font-mono">A Minnesota native specializing in tarts, bars, cakes, and fresh pasta.</p>
                    </div>
                </div>
                 <div className="border border-gray-900 p-8">
                    <h3 className="text-2xl font-bold mb-4">Special Skills</h3>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 font-mono flex flex-col space-y-2">
                           {specialSkills.map(skill => (
                               <button key={skill.name} onMouseEnter={() => setActiveSkill(skill)} className={`text-left p-2 border-l-2 ${activeSkill.name === skill.name ? 'border-gray-900 bg-gray-200' : 'border-transparent hover:bg-gray-200'}`}>
                                   {skill.name}
                               </button>
                           ))}
                        </div>
                        <div className="md:col-span-2 bg-gray-200 p-6 font-mono min-h-[150px]">
                            <p>{activeSkill.description}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};