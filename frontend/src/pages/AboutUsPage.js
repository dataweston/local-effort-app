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
                {/* Header with custom typography */}
                <div className="animate-fade-in-up">
                    <h1 className="text-hero font-display">About Us</h1>
                    <div className="w-24 h-1 bg-gradient-warm mt-4"></div>
                </div>

                {/* Intro with enhanced typography */}
                <p className="text-body-large font-body max-w-4xl animate-fade-in-up stagger-1">
                    With 30 years of collective experience, we are passionate about food and hospitality. 
                    We believe in quality, handmade products and sourcing the best local ingredients without compromise.
                </p>

                {/* Team Cards */}
                <div className="grid md:grid-cols-2 gap-8 animate-fade-in-up stagger-2">
                    <div className="card">
                        <img 
                            src="/gallery/IMG-1013.JPG" 
                            alt="Weston Smith" 
                            className="card-image"
                        />
                        <div className="card-content">
                            <h3 className="text-subheading font-display mb-2">Weston Smith</h3>
                            <p className="text-caption mb-4">Chef de Cuisine, Director</p>
                            <p className="text-body">
                                California-born and New York-trained, Weston is in charge of baking our sourdough bread and creating the menus.
                            </p>
                        </div>
                    </div>
                    
                    <div className="card">
                        <img 
                            src="/gallery/IMG-6353.JPG" 
                            alt="Catherine Olsen" 
                            className="card-image"
                        />
                        <div className="card-content">
                            <h3 className="text-subheading font-display mb-2">Catherine Olsen</h3>
                            <p className="text-caption mb-4">Pastry, General Manager</p>
                            <p className="text-body">
                                A Minnesota native specializing in tarts, bars, cakes, and fresh pasta.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Special Skills Section */}
                <div className="card animate-fade-in-up stagger-3">
                    <div className="card-content">
                        <h3 className="text-heading font-display mb-8">Special Skills</h3>
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Skills Navigation */}
                            <div className="md:col-span-1 space-y-2">
                                {specialSkills.map((skill, index) => (
                                    <button 
                                        key={skill.name} 
                                        onMouseEnter={() => setActiveSkill(skill)}
                                        className={`btn-ghost w-full text-left justify-start transition-all duration-300 ${
                                            activeSkill.name === skill.name 
                                                ? 'bg-secondary-cream border-primary-warm text-primary-warm' 
                                                : 'hover:bg-secondary-cream'
                                        }`}
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        {skill.name}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Skill Description */}
                            <div className="md:col-span-2">
                                <div className="bg-secondary-cream rounded-lg p-6 min-h-[200px] transition-all duration-500">
                                    <h4 className="text-subheading font-display mb-4 gradient-text">
                                        {activeSkill.name}
                                    </h4>
                                    <p className="text-body leading-relaxed">
                                        {activeSkill.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};