import React from 'react';
import CityPage from './_CityPage';

const cloud = (pub) => ({
  src: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_1200/${pub}`,
  src400: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_400/${pub}`,
  src800: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_800/${pub}`,
  src1200: `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd'}/image/upload/f_auto,q_auto,w_1200/${pub}`,
});

export default function PersonalChefStPaulPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-st-paul';
  const description = 'Personal Chef St. Paul — in-home chef dinners, small events, and weekly meal prep across St. Paul.';
  const img1 = cloud('site/gallery/ravioli-stpaul');
  const img2 = cloud('site/gallery/river-view-dinner');
  const img3 = cloud('site/gallery/private-dining-stpaul');
  const images = [
    { ...img1, alt: 'Handmade ravioli — St. Paul personal chef', caption: 'Handmade ravioli with local ricotta — St. Paul personal chef.' },
    { ...img2, alt: 'Private dinner with river views — St. Paul', caption: 'Private dinner near the Mississippi — St. Paul, MN.' },
    { ...img3, alt: 'In-home private dining — St. Paul', caption: 'In-home private dining in St. Paul — Local Effort.' },
  ].map((i) => ({ ...i, thumb: i.src400 }));
  const faq = [
    { q: 'Do you serve St. Paul?', a: 'Yes — we serve St. Paul and the Twin Cities metro.' },
    { q: 'How far ahead should I book?', a: 'For weekends, 3–6 weeks notice is best. Weeknights often have more availability.' },
  ];

  return (
    <CityPage
      city="St. Paul"
      h1="Personal Chef St. Paul"
      description={description}
      canonical={canonical}
      images={images}
      faq={faq}
    />
  );
}
