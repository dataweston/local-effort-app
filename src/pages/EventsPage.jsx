import React from 'react';
import { Helmet } from 'react-helmet-async';

export const EventsPage = () => (
  <>
    <Helmet>
      <title>Dinners & Events | Local Effort</title>
      <meta
        name="description"
        content="Let Local Effort cater your next event. We specialize in in-home dining for parties of 2 to 50."
      />
    </Helmet>
    <div className="space-y-16">
      <h2 className="text-5xl md:text-7xl font-bold uppercase">Dinners & Events</h2>
      <p className="font-mono text-lg max-w-3xl">
        We bring our passion for food and hospitality to your home or venue. We specialize in
        cooking for parties from 2 to 50 people.
      </p>
    </div>
  </>
);
