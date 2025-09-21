import React from 'react';
import CityPage from './_CityPage';

const cloud = (pub) => ({
  src: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_1200/${pub}`,
  src400: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_400/${pub}`,
  src800: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_800/${pub}`,
  src1200: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_1200/${pub}`,
});

export default function PersonalChefMinneapolisPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-minneapolis';
  const description = 'Personal Chef Minneapolis — private in-home dinners, weekly meal prep, and small event catering across Minneapolis neighborhoods.';
  const img1 = cloud('site/gallery/seared-trout');
  const img2 = cloud('site/gallery/seasonal-salad');
  const img3 = cloud('site/gallery/chef-table-minneapolis');
  const images = [
    { ...img1, alt: 'Personal chef plated seared trout — Minneapolis', caption: 'Private chef plated seared trout — Local Effort, Minneapolis.' },
    { ...img2, alt: 'Seasonal salad — Minneapolis personal chef', caption: 'Seasonal salad with local produce — Minneapolis personal chef.' },
    { ...img3, alt: 'Chef’s table in Minneapolis', caption: 'Chef’s table dinner in Minneapolis — intimate, in-home dining.' },
  ].map((i) => ({
    ...i,
    thumb: i.src400,
  }));
  const faq = [
    { q: 'Do you serve Minneapolis?', a: 'Yes — we serve all Minneapolis neighborhoods and the Twin Cities metro.' },
    { q: 'What does pricing include?', a: 'Planning, shopping, on-site cooking, service, and cleanup. Ingredients are included or billed at cost depending on the event.' },
  ];

  return (
    <CityPage
      city="Minneapolis"
      h1="Personal Chef Minneapolis"
      description={description}
      canonical={canonical}
      images={images}
      faq={faq}
    />
  );
}
