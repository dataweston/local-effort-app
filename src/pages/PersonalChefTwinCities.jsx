import React from 'react';
import CityPage from './_CityPage';
import { makeCityImage } from './cityImageUtils';

export default function PersonalChefTwinCitiesPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-twin-cities';
  const description = 'Personal Chef Twin Cities — in-home dinners, meal prep, and intimate event catering across Minneapolis—Saint Paul.';
  const img1 = {
    ...makeCityImage('site/gallery/shared-plates-tc', { fallback: '/gallery/IMG_9262.jpg' }),
    alt: 'Shared plates dinner — Twin Cities',
    caption: 'Shared plates dinner in the Twin Cities — Local Effort.',
  };
  const img2 = {
    ...makeCityImage('site/gallery/meal-prep-tc', { fallback: '/gallery/IMG_2923.jpg' }),
    alt: 'Weekly meal prep — Twin Cities',
    caption: 'Weekly meal prep services across the Twin Cities.',
  };
  const img3 = {
    ...makeCityImage('site/gallery/event-catering-tc', { fallback: '/gallery/5Z0A5637-Edit.jpg' }),
    alt: 'Intimate event catering — Twin Cities',
    caption: 'Intimate event catering, Minneapolis—Saint Paul.',
  };
  const images = [img1, img2, img3].map((image) => ({
    ...image,
    thumb: image.thumb || image.src400 || image.fallback,
  }));
  const faq = [
    { q: 'Do you serve the entire metro?', a: 'Yes — we serve Minneapolis, St. Paul, Roseville, and surrounding suburbs.' },
    { q: 'Can you accommodate dietary needs?', a: 'Absolutely — we regularly accommodate GF, DF, vegetarian, and other needs.' },
  ];

  return (
    <CityPage
      city="Twin Cities"
      h1="Personal Chef Twin Cities"
      title="Personal Chef Twin Cities | Minneapolis | Local Effort"
      description="Personal chef serving the Twin Cities metro: in-home dinners, weekly meal prep, and intimate event catering. Minneapolis, St. Paul, Roseville, and beyond. Book today."
      canonical={canonical}
      images={images}
      faq={faq}
    />
  );
}
