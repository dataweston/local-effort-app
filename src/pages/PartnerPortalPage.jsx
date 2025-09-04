import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const PartnerPortalPage = () => {
  return (
    <>
      <Helmet>
        <title>Partner Portal | Local Effort</title>
        <meta name="description" content="Tools and resources for Local Effort partners." />
      </Helmet>
      <div className="space-y-6">
        <h2 className="text-5xl md:text-7xl font-bold uppercase">Partner Portal</h2>
        <p className="text-body max-w-2xl">Welcome. Continue to the portal welcome to sign in and see tools.</p>
        <Link to="/partner-portal/welcome" className="inline-block px-4 py-2 rounded bg-black text-white">Enter Portal</Link>
      </div>
    </>
  );
};

export default PartnerPortalPage;
