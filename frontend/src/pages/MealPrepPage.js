import React from 'react';
import { Helmet } from 'react-helmet-async';
import { VennDiagram } from '../components/common/VennDiagram';

export const MealPrepPage = () => (
    <>
        <Helmet>
            <title>Weekly Meal Prep | Local Effort</title>
            <meta name="description" content="Our Foundation Meal Plan provides 21 nutritious meals per week from local Midwest sources." />
        </Helmet>
        <div className="space-y-16">
            <h2 className="text-5xl md:text-7xl font-bold uppercase">Weekly Meal Prep</h2>
            <p className="font-mono text-lg max-w-3xl">Basic, good nutrition from local Midwest sources. We offer a Foundation Plan and are happy to create custom plans for any diet.</p>
            <div className="border border-gray-900 p-8">
                <h3 className="text-3xl font-bold mb-4">Foundation Meal Plan</h3>
                <VennDiagram />
                <p className="font-mono mb-6 max-w-2xl">Inspired by the 'Protocol' by Bryan Johnson, this plan provides up to 21 meals/week at ~1800 calories/day.</p>
            </div>
        </div>
    </>
);