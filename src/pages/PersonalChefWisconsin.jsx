import React from 'react';
import CityPage from './_CityPage';
import { makeCityImage } from './cityImageUtils';

export default function PersonalChefWisconsinPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-wisconsin';
  const description = 'Personal Chef Wisconsin — private chef dinners, meal prep, and intimate event catering in Western Wisconsin.';
<<<<<<< HEAD
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
=======
  const img1 = cloud('site/gallery/wisconsin-farm-dinner');
  const img2 = cloud('site/gallery/wisconsin-meal-prep');
  const img3 = cloud('site/gallery/wisconsin-event');
  const images = [
    {
      ...img1,
      alt: 'Farm dinner — Western Wisconsin',
      caption: 'Farm dinner in Western Wisconsin — Local Effort.',
      fallbackSrc: '/gallery/5Z0A5637-Edit.jpg',
    },
    {
      ...img2,
      alt: 'Weekly meal prep — Wisconsin',
      caption: 'Weekly meal prep services in Western Wisconsin.',
      fallbackSrc: '/gallery/IMG_9262.jpg',
    },
    {
      ...img3,
      alt: 'Intimate event catering — Wisconsin',
      caption: 'Small event catering in Western Wisconsin.',
      fallbackSrc: '/gallery/5Z0A5724-Edit.jpg',
    },
  ].map((i) => ({ ...i, thumb: i.src400 }));
>>>>>>> a438e607553c514e1fe73e9395ebf456acce3e0b
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
