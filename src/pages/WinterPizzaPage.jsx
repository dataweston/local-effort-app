import React from 'react';
import { Helmet } from 'react-helmet-async';

const WinterPizzaPage = () => {
  return (
    <>
      <Helmet>
        <title>Winter Pizza | Local Effort</title>
        <meta name="description" content="Winter Pizza" />
        <link rel="canonical" href="https://localeffortfood.com/winterpizza" />
      </Helmet>

      <div
        className="min-h-screen w-full bg-center bg-cover md:bg-contain md:bg-no-repeat"
        style={{
          backgroundImage: `url(/images/IMG_4930.JPEG)`
        }}
      >
        {/* Content can be added here */}
      </div>
    </>
  );
};

export default WinterPizzaPage;
