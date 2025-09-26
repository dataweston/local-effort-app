import React from 'react';
import { Helmet } from 'react-helmet-async';
import PhotoGrid from '../components/common/PhotoGrid';

const EventsPage = () => (
  <>
    <Helmet>
      <title>Dinners & Events | Local Effort</title>
      <meta
        name="description"
        content="Let Local Effort cater your next event. We specialize in in-home dining for parties of 2 to 50."
      />
    </Helmet>
    <div className="space-y-16">
      <h1 className="heading-display heading-balance">Dinners & events</h1>
      <p className="font-mono text-lg max-w-3xl">
        We bring our passion for food and hospitality to your home or venue. We specialize in
        cooking for parties from 2 to 50 people.
      </p>
    </div>

    {/* Photos tagged 'dinner' and 'event' */}
    <div className="container mx-auto px-4 py-8">
      <PhotoGrid tags={["dinner","event"]} title="Dinners & events photos" perPage={24} />
    </div>
  </>
);

export default EventsPage;
