import React from 'react';
import { Helmet } from 'react-helmet-async';

const PartnerPortalPage = () => {
  return (
    <>
      <Helmet>
        <title>Partner Portal | Local Effort</title>
        <meta name="description" content="Tools and resources for Local Effort partners." />
      </Helmet>
      <div className="space-y-6">
        <h2 className="text-5xl md:text-7xl font-bold uppercase">Partner Portal</h2>
        <p className="text-body max-w-2xl">Coming soon. This space will host partner resources, uploads, and status.</p>
      </div>
    </>
  );
};

export default PartnerPortalPage;
