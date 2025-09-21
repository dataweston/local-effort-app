import React from 'react';
import CityPage from './_CityPage';

const cloud = (pub) => ({
  src: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_1200/${pub}`,
  src400: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_400/${pub}`,
  src800: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_800/${pub}`,
  src1200: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_1200/${pub}`,
});

export default function PersonalChefWisconsinPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-wisconsin';
  const description = 'Personal Chef Wisconsin — private chef dinners, meal prep, and intimate event catering in Western Wisconsin.';
  const img1 = cloud('site/gallery/wisconsin-farm-dinner');
  const img2 = cloud('site/gallery/wisconsin-meal-prep');
  const img3 = cloud('site/gallery/wisconsin-event');
  const images = [
    { ...img1, alt: 'Farm dinner — Western Wisconsin', caption: 'Farm dinner in Western Wisconsin — Local Effort.' },
    { ...img2, alt: 'Weekly meal prep — Wisconsin', caption: 'Weekly meal prep services in Western Wisconsin.' },
    { ...img3, alt: 'Intimate event catering — Wisconsin', caption: 'Small event catering in Western Wisconsin.' },
  ].map((i) => ({ ...i, thumb: i.src400 }));
  const faq = [
    { q: 'Do you serve the St. Croix Valley?', a: 'Yes — we regularly serve Hudson, River Falls, and nearby communities.' },
    { q: 'Is travel included?', a: 'Travel fees may apply depending on distance and event details.' },
  ];

  return (
    <CityPage
      city="Wisconsin"
      h1="Personal Chef Wisconsin"
      description={description}
      canonical={canonical}
      images={images}
      faq={faq}
    />
  );
}
