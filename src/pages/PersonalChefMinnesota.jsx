import React from 'react';
import CityPage from './_CityPage';
import { makeCityImage } from './cityImageUtils';

export default function PersonalChefMinnesotaPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-minnesota';
  const description = 'Personal Chef Minnesota — in-home dinners, weekly meal prep, and intimate event catering across Minnesota.';
  const img1 = {
    ...makeCityImage('site/gallery/minnesota-lake-dinner', { fallback: '/gallery/IMG_3595.jpg' }),
    alt: 'Private chef lakeside dinner — Minnesota',
    caption: 'Lakeside private dinner in Minnesota — Local Effort.',
  };
  const img2 = {
    ...makeCityImage('site/gallery/minnesota-meal-prep', { fallback: '/gallery/IMG_2923.jpg' }),
    alt: 'Weekly meal prep — Minnesota',
    caption: 'Weekly meal prep services across Minnesota.',
  };
  const img3 = {
    ...makeCityImage('site/gallery/minnesota-event', { fallback: '/gallery/IMG_9226.jpg' }),
    alt: 'Small event catering — Minnesota',
    caption: 'Intimate event catering across Minnesota.',
  };
  const images = [img1, img2, img3].map((image) => ({
    ...image,
    thumb: image.thumb || image.src400 || image.fallback,
  }));
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
