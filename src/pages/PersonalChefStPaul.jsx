import React from 'react';
import CityPage from './_CityPage';
import { makeCityImage } from './cityImageUtils';

export default function PersonalChefStPaulPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-st-paul';
  const description = 'Personal Chef St. Paul — in-home chef dinners, small events, and weekly meal prep across St. Paul.';
  const img1 = {
    ...makeCityImage('site/gallery/ravioli-stpaul', { fallback: '/gallery/5Z0A5724-Edit.jpg' }),
    alt: 'Handmade ravioli — St. Paul personal chef',
    caption: 'Handmade ravioli with local ricotta — St. Paul personal chef.',
  };
  const img2 = {
    ...makeCityImage('site/gallery/river-view-dinner', { fallback: '/gallery/IMG_9305.jpg' }),
    alt: 'Private dinner with river views — St. Paul',
    caption: 'Private dinner near the Mississippi — St. Paul, MN.',
  };
  const img3 = {
    ...makeCityImage('site/gallery/private-dining-stpaul', { fallback: '/gallery/IMG_9403.jpg' }),
    alt: 'In-home private dining — St. Paul',
    caption: 'In-home private dining in St. Paul — Local Effort.',
  };
  const images = [img1, img2, img3].map((image) => ({
    ...image,
    thumb: image.thumb || image.src400 || image.fallback,
  }));
  const faq = [
    { q: 'Do you serve St. Paul?', a: 'Yes — we serve St. Paul and the Twin Cities metro.' },
    { q: 'How far ahead should I book?', a: 'For weekends, 3–6 weeks notice is best. Weeknights often have more availability.' },
  ];

  return (
    <CityPage
      city="St. Paul"
      h1="Personal Chef St. Paul"
      title="Personal Chef St. Paul | In-Home | Local Effort"
      description="Personal chef in St. Paul for in-home dinners, small events, and weekly meal prep. Seasonal local ingredients and chef-led service across all neighborhoods. Book now."
      canonical={canonical}
      images={images}
      faq={faq}
    />
  );
}
