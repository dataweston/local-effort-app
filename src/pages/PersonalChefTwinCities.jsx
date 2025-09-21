import React from 'react';
import CityPage from './_CityPage';

const cloud = (pub) => ({
  src: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_1200/${pub}`,
  src400: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_400/${pub}`,
  src800: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_800/${pub}`,
  src1200: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_1200/${pub}`,
});

export default function PersonalChefTwinCitiesPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-twin-cities';
  const description = 'Personal Chef Twin Cities — in-home dinners, meal prep, and intimate event catering across Minneapolis–Saint Paul.';
  const img1 = cloud('site/gallery/shared-plates-tc');
  const img2 = cloud('site/gallery/meal-prep-tc');
  const img3 = cloud('site/gallery/event-catering-tc');
  const images = [
    { ...img1, alt: 'Shared plates dinner — Twin Cities', caption: 'Shared plates dinner in the Twin Cities — Local Effort.' },
    { ...img2, alt: 'Weekly meal prep — Twin Cities', caption: 'Weekly meal prep services across the Twin Cities.' },
    { ...img3, alt: 'Intimate event catering — Twin Cities', caption: 'Intimate event catering, Minneapolis–Saint Paul.' },
  ].map((i) => ({ ...i, thumb: i.src400 }));
  const faq = [
    { q: 'Do you serve the entire metro?', a: 'Yes — we serve Minneapolis, St. Paul, Roseville, and surrounding suburbs.' },
    { q: 'Can you accommodate dietary needs?', a: 'Absolutely — we regularly accommodate GF, DF, vegetarian, and other needs.' },
  ];

  return (
    <CityPage
      city="Twin Cities"
      h1="Personal Chef Twin Cities"
      description={description}
      canonical={canonical}
      images={images}
      faq={faq}
    />
  );
}
