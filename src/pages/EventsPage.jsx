import React from 'react';
import { Helmet } from 'react-helmet-async';
import PhotoGrid from '../components/common/PhotoGrid';

const EventsPage = () => (
  <>
    <Helmet>
      <title>Event Catering & In-Home Dinners Minneapolis | Local Effort</title>
      <meta
        name="description"
        content="In-home dinner parties and small event catering in Minneapolis–St. Paul for 2–50 guests. Seasonal menus, chef-led service, and local ingredients. Book an event."
      />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Event Catering & In-Home Dinners",
        "serviceType": "Event Catering",
        "description": "In-home dinner parties and small event catering in Minneapolis–St. Paul for 2–50 guests.",
        "provider": {
          "@type": "LocalBusiness",
          "name": "Local Effort"
        },
        "areaServed": [
          {"@type": "Place", "name": "Minneapolis"},
          {"@type": "Place", "name": "St. Paul"},
          {"@type": "Place", "name": "Twin Cities"}
        ],
        "offers": {
          "@type": "Offer",
          "priceCurrency": "USD",
          "price": "95",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "95-135",
            "priceCurrency": "USD",
            "unitText": "per guest"
          }
        }
      })}</script>
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
