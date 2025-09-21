import React from 'react';
import CityPage from './_CityPage';

const cloud = (pub) => ({
  src: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_1200/${pub}`,
  src400: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_400/${pub}`,
  src800: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_800/${pub}`,
  src1200: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_1200/${pub}`,
});

export default function PersonalChefMinnesotaPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-minnesota';
  const description = 'Personal Chef Minnesota — in-home dinners, weekly meal prep, and intimate event catering across Minnesota.';
  const img1 = cloud('site/gallery/minnesota-lake-dinner');
  const img2 = cloud('site/gallery/minnesota-meal-prep');
  const img3 = cloud('site/gallery/minnesota-event');
  const images = [
    { ...img1, alt: 'Private chef lakeside dinner — Minnesota', caption: 'Lakeside private dinner in Minnesota — Local Effort.' },
    { ...img2, alt: 'Weekly meal prep — Minnesota', caption: 'Weekly meal prep services across Minnesota.' },
    { ...img3, alt: 'Small event catering — Minnesota', caption: 'Intimate event catering across Minnesota.' },
  ].map((i) => ({ ...i, thumb: i.src400 }));
  const faq = [
    { q: 'Do you travel outside the Twin Cities?', a: 'Yes — we travel statewide for select dinners and events depending on scheduling.' },
    { q: 'What local ingredients do you use?', a: 'We highlight Minnesota farms: walleye, trout, wild rice, seasonal produce, and more.' },
  ];

  return (
    <CityPage
      city="Minnesota"
      h1="Personal Chef Minnesota"
      description={description}
      canonical={canonical}
      images={images}
      faq={faq}
    />
  );
}
