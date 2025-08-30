import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const ServicesPage = () => {
  const navigate = useNavigate();
  return (
    <>
      <Helmet>
        <title>Services | Local Effort</title>
        <meta
          name="description"
          content="Explore the personal chef and catering services offered by Local Effort."
        />
      </Helmet>
      <div className="space-y-16">
        <h2 className="text-hero uppercase border-b border-gray-900 pb-4">Services</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="card space-y-4">
            <h3 className="text-heading">Weekly Meal Prep</h3>
            <p className="text-body">
              Nutritious, locally-sourced meals delivered weekly. Foundation & custom plans.
            </p>
            <button onClick={() => navigate('/meal-prep')} className="text-body text-sm underline">
              Details &rarr;
            </button>
          </div>
          <div className="card space-y-4">
            <h3 className="text-heading">Dinners & Events</h3>
            <p className="text-body">In-home chef experiences for parties of 2 to 50.</p>
            <button onClick={() => navigate('/events')} className="text-body text-sm underline">
              Details &rarr;
            </button>
          </div>
          <div className="card space-y-4">
            <h3 className="text-heading">Pizza Parties</h3>
            <p className="text-body">Mobile wood-fired pizza for a fun, delicious event.</p>
            <button
              onClick={() => navigate('/pizza-party')}
              className="text-body text-sm underline"
            >
              Details &rarr;
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
export default ServicesPage;
