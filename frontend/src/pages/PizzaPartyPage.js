import React from 'react';
import { Helmet } from 'react-helmet-async';

export const PizzaPartyPage = () => (
    <>
        <Helmet>
            <title>Mobile Pizza Parties | Local Effort</title>
            <meta name="description" content="Book a mobile wood-fired pizza party with Local Effort." />
        </Helmet>
        <div className="space-y-16">
            <h2 className="text-5xl md:text-7xl font-bold uppercase">Pizza Parties</h2>
            <p className="font-mono text-lg max-w-3xl">Our mobile wood-fired pizza oven is the perfect addition to any event.</p>
        </div>
    </>
);