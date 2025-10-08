import React from 'react';
import CityPage from './_CityPage';
import { makeCityImage } from './cityImageUtils';

export default function PersonalChefMinneapolisPage() {
  const canonical = 'https://localeffortfood.com/personal-chef-minneapolis';
  const description =
    'Personal Chef Minneapolis — Local Effort Food Co. cooks in-home dinners, meal prep Minneapolis services, and custom meal plan Minneapolis solutions across every neighborhood.';
  const img1 = {
    ...makeCityImage('site/gallery/seared-trout', { fallback: '/gallery/5Z0A5665-Edit.jpg' }),
    alt: 'Personal chef plated seared trout — Minneapolis',
    caption: 'Private chef plated seared trout — Minneapolis personal chef for small events.',
  };
  const img2 = {
    ...makeCityImage('site/gallery/seasonal-salad', { fallback: '/gallery/IMG_4390.jpg' }),
    alt: 'Seasonal salad — Minneapolis personal chef meal prep',
    caption: 'Seasonal salad with local produce — meal prep Minneapolis personal chef team.',
  };
  const img3 = {
    ...makeCityImage('site/gallery/chef-table-minneapolis', { fallback: '/gallery/IMG_3185.jpg' }),
    alt: 'Chef’s table in Minneapolis',
    caption: 'Chef’s table dinner in Minneapolis — intimate, in-home dining with Local Effort.',
  };
  const images = [
    img1,
    img2,
    img3,
  ].map((image) => ({
    ...image,
    thumb: image.thumb || image.src400 || image.fallback,
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
