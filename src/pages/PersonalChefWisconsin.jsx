import React from 'react';
import CityPage from './_CityPage';
import { makeCityImage } from './cityImageUtils';

export default function PersonalChefWisconsinPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-wisconsin';
  const description = 'Personal Chef Wisconsin — private chef dinners, meal prep, and intimate event catering in Western Wisconsin.';
  const img1 = {
    ...makeCityImage('site/gallery/wisconsin-farm-dinner', { fallback: '/gallery/IMG_9194.jpg' }),
    alt: 'Farm dinner — Western Wisconsin',
    caption: 'Farm dinner in Western Wisconsin — Local Effort.',
  };
  const img2 = {
    ...makeCityImage('site/gallery/wisconsin-meal-prep', { fallback: '/gallery/IMG_4390.jpg' }),
    alt: 'Weekly meal prep — Wisconsin',
    caption: 'Weekly meal prep services in Western Wisconsin.',
  };
  const img3 = {
    ...makeCityImage('site/gallery/wisconsin-event', { fallback: '/gallery/IMG_4523.jpg' }),
    alt: 'Intimate event catering — Wisconsin',
    caption: 'Small event catering in Western Wisconsin.',
  };
  const images = [img1, img2, img3].map((image) => ({
    ...image,
    thumb: image.thumb || image.src400 || image.fallback,
  }));
  const faq = [
    { q: 'Do you serve the St. Croix Valley?', a: 'Yes — we regularly serve Hudson, River Falls, and nearby communities.' },
    { q: 'Is travel included?', a: 'Travel fees may apply depending on distance and event details.' },
  ];

  return (
    <CityPage
      city="Wisconsin"
      h1="Personal Chef Wisconsin"
      title="Personal Chef Wisconsin | Western WI | Local Effort"
      description="Personal chef in Western Wisconsin for private dinners, meal prep, and event catering. Serving Hudson, River Falls, and the St. Croix Valley with local ingredients."
      canonical={canonical}
      images={images}
      faq={faq}
    />
  );
}
