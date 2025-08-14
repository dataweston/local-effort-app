import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export const ServicesPage = () => {
    const navigate = useNavigate();
    return (
        <>
            <Helmet>
                <title>Services | Local Effort</title>
                <meta name="description" content="Explore the personal chef and catering services offered by Local Effort." />
            </Helmet>
            <div className="space-y-16">
                <h2 className="text-5xl md:text-7xl font-bold uppercase border-b border-gray-900 pb-4">Services</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="border border-gray-900 p-8 space-y-4">
                        <h3 className="text-3xl font-bold">Weekly Meal Prep</h3>
                        <p className="font-mono">Nutritious, locally-sourced meals delivered weekly. Foundation & custom plans.</p>
                        <button onClick={() => navigate('/meal-prep')} className="font-mono text-sm underline">Details &rarr;</button>
                    </div>
                    <div className="border border-gray-900 p-8 space-y-4">
                        <h3 className="text-3xl font-bold">Dinners & Events</h3>
                        <p className="font-mono">In-home chef experiences for parties of 2 to 50.</p>
                        <button onClick={() => navigate('/events')} className="font-mono text-sm underline">Details &rarr;</button>
                    </div>
                    <div className="border border-gray-900 p-8 space-y-4">
                        <h3 className="text-3xl font-bold">Pizza Parties</h3>
                        <p className="font-mono">Mobile wood-fired pizza for a fun, delicious event.</p>
                        <button onClick={() => navigate('/pizza-party')} className="font-mono text-sm underline">Details &rarr;</button>
                    </div>
                </div>
            </div>
        </>
    );
};