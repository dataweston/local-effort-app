import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ServiceCard } from '../components/common/ServiceCard';

export const HomePage = () => {
  const navigate = useNavigate();
  return (
    <>
      <Helmet>
        <title>Local Effort | Personal Chef & Event Catering in Roseville, MN</title>
        <meta name="description" content="Local Effort offers personal chef services, event catering, and weekly meal prep in Roseville, MN." />
      </Helmet>
      <div className="space-y-16 md:space-y-32">
        <section className="grid md:grid-cols-2 gap-8 items-center min-h-[60vh]">
            <div>
                <h2 className="text-5xl md:text-7xl font-bold uppercase">Minnesotan Food</h2>
                <h3 className="text-5xl md:text-7xl font-bold uppercase text-gray-400">For Your Functions.</h3>
                <p className="mt-8 font-mono max-w-md">Professional in-home dining. 30 years collective fine food experience. Sourcing the best local ingredients without compromise.</p>
                <button onClick={() => navigate('/services')} className="mt-8 bg-gray-900 text-white font-mono py-3 px-6 text-lg hover:bg-gray-700">Explore Services</button>
            </div>
            <div className="w-full min-h-[400px] h-full bg-gray-200 border border-gray-900 p-4">
                <div className="w-full h-full border border-gray-900 bg-cover bg-center" style={{backgroundImage: "url('/gallery/IMG_3145.jpg')"}}></div>
            </div>
        </section>
        <section>
            <h3 className="text-3xl font-bold uppercase mb-8 border-b border-gray-900 pb-4">Core Offerings</h3>
            <div className="grid md:grid-cols-3 gap-px bg-gray-900 border border-gray-900">
                 <ServiceCard to="/meal-prep" title="Weekly Meal Prep" description="Foundation & custom plans. Basic, good nutrition from local Midwest sources." />
                 <ServiceCard to="/events" title="Dinners & Events" description="Event catering and In-home chef experiences, for parties of 2 to 50." />
                 <ServiceCard to="/pizza-party" title="Pizza Parties" description="Mobile high-temperature pizza oven, sourdough crusts, and all local ingredients." />
            </div>
        </section>
      </div>
    </>
  );
};