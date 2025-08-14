import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { sampleMenus } from '../data/sampleMenus';

export const MenuPage = () => {
    const [openMenu, setOpenMenu] = useState(0);
    return (
        <>
            <Helmet>
                <title>Menu Examples | Local Effort</title>
                <meta name="description" content="View sample menus from real events catered by Local Effort." />
            </Helmet>
            <div className="space-y-16">
                <h2 className="text-5xl md:text-7xl font-bold uppercase">Menu Examples</h2>
                <p className="font-mono text-lg max-w-3xl">We create custom menus for every event. These are from real events and are intended as inspiration.</p>
                <div className="space-y-px bg-gray-900 border border-gray-900">
                    {sampleMenus.map((menu, index) => (
                        <div key={index} className="bg-[#F5F5F5]">
                            <button onClick={() => setOpenMenu(openMenu === index ? null : index)} className="w-full p-8 text-left flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-bold">"{menu.title}"</h3>
                                    {menu.description && <p className="font-mono text-gray-600">{menu.description}</p>}
                                </div>
                                <span className={`transform transition-transform duration-300 text-3xl ${openMenu === index ? 'rotate-45' : ''}`}>+</span>
                            </button>
                            {openMenu === index && (
                                <div className="p-8 pt-0 font-mono text-sm">
                                    <div className="border-t border-gray-300 pt-4 space-y-4">
                                        {menu.sections.map((section, sIndex) => (
                                            <div key={sIndex}>
                                                <h4 className="font-bold uppercase border-b border-gray-300 pb-1 mb-2">{section.course}</h4>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {section.items.map((item, iIndex) => <li key={iIndex}>{item}</li>)}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};