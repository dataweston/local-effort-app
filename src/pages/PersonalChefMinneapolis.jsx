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
  const description =
    'Personal Chef Minneapolis — Local Effort Food Co. cooks in-home dinners, meal prep Minneapolis services, and custom meal plan Minneapolis solutions across every neighborhood.';
  const img1 = cloud('site/gallery/seared-trout');
  const img2 = cloud('site/gallery/seasonal-salad');
  const img3 = cloud('site/gallery/chef-table-minneapolis');
  const images = [
    {
      ...img1,
      alt: 'Personal chef plated seared trout — Minneapolis',
      caption: 'Private chef plated seared trout — Minneapolis personal chef for small events.',
    },
    {
      ...img2,
      alt: 'Seasonal salad — Minneapolis personal chef meal prep',
      caption: 'Seasonal salad with local produce — meal prep Minneapolis personal chef team.',
    },
    {
      ...img3,
      alt: 'Chef’s table in Minneapolis',
      caption: 'Chef’s table dinner in Minneapolis — intimate, in-home dining with Local Effort.',
    },
  ].map((i) => ({
    ...i,
    thumb: i.src400,
  }));
  const faq = [
    { q: 'Do you serve Minneapolis?', a: 'Yes — we serve all Minneapolis neighborhoods and the Twin Cities metro.' },
    {
      q: 'How much does a personal chef cost in Minneapolis?',
      a: 'Most Minneapolis personal chef dinners range from $95 to $135 per guest with service, staffing, and cleanup included. Weekly meal prep packages typically start around $325 for 12 chef-prepared meals.',
    },
    {
      q: 'Do you offer meal prep or meal plans in Minneapolis?',
      a: 'Yes. We deliver recurring meal prep Minneapolis menus and flexible meal plan Minneapolis add-ons for families, busy professionals, and postpartum support.',
    },
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
