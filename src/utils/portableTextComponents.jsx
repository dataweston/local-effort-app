import React from 'react';
import imageUrlBuilder from '@sanity/image-url';

import sanityClient from '../sanityClient';

const accentLinkClass = 'text-[var(--color-accent)] underline underline-offset-4 decoration-[var(--color-accent)] hover:opacity-80 transition-colors';

function DefaultLink({ children, value }) {
  const href = typeof value?.href === 'string' && value.href.trim() ? value.href : '#';
  const explicitTarget = value?.target || value?.blank;
  const isExternal = /^https?:/i.test(href);
  const shouldOpenNewTab = explicitTarget === '_blank' || explicitTarget === true || (explicitTarget === undefined && isExternal);
  const target = shouldOpenNewTab ? '_blank' : undefined;
  const rel = shouldOpenNewTab ? 'noopener noreferrer' : undefined;

  return (
    <a href={href} target={target} rel={rel} className={accentLinkClass}>
      {children}
    </a>
  );
}

let imageBuilder = null;
try {
  imageBuilder = imageUrlBuilder(sanityClient);
} catch (error) {
  imageBuilder = null;
}

function resolveImageUrl(value) {
  if (value?.asset?.url) {
    return value.asset.url;
  }

  if (!value?.asset?._ref || !imageBuilder) {
    return '';
  }

  try {
    return imageBuilder.image(value).width(1600).quality(80).fit('max').url();
  } catch (error) {
    return '';
  }
}

function DefaultPortableTextImage({ value }) {
  const src = resolveImageUrl(value);
  if (!src) {
    return null;
  }

  const alt = typeof value?.alt === 'string' ? value.alt : '';

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="my-4 w-full rounded-md object-contain"
    />
  );
}

export function createPortableTextComponents(overrides = {}) {
  const { marks: providedMarks = {}, types: providedTypes = {}, ...rest } = overrides;
  return {
    ...rest,
    marks: {
      link: DefaultLink,
      ...providedMarks,
    },
    types: {
      image: DefaultPortableTextImage,
      ...providedTypes,
    },
  };
}

export const portableTextComponents = createPortableTextComponents();
