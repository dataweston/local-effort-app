import React from 'react';
import imageUrlBuilder from '@sanity/image-url';

import sanityClient from '../sanityClient';

const accentLinkClass = 'text-[var(--color-accent)] underline underline-offset-4 decoration-[var(--color-accent)] hover:opacity-80 transition-colors';

function DefaultLink({ children, value }) {
  const href = typeof value?.href === 'string' && value.href.trim() ? value.href : '#';
  const explicitTarget = value?.target || value?.blank || value?.openInNewTab;
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

const RAW_URL_RE = /(?:https?:\/\/|www\.)[^\s<>]+/gi;
const TRAILING_URL_PUNCTUATION_RE = /[.,;:!?\)\]\}]+$/;

function linkifyText(text, keyPrefix) {
  const pieces = [];
  let cursor = 0;
  let match;
  RAW_URL_RE.lastIndex = 0;

  while ((match = RAW_URL_RE.exec(text)) !== null) {
    if (match.index > cursor) pieces.push(text.slice(cursor, match.index));
    const raw = match[0];
    const trailing = raw.match(TRAILING_URL_PUNCTUATION_RE)?.[0] || '';
    const label = trailing ? raw.slice(0, -trailing.length) : raw;
    const href = label.startsWith('www.') ? `https://${label}` : label;
    pieces.push(
      <a
        key={`${keyPrefix}-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={accentLinkClass}
      >
        {label}
      </a>
    );
    if (trailing) pieces.push(trailing);
    cursor = match.index + raw.length;
  }

  if (cursor < text.length) pieces.push(text.slice(cursor));
  return pieces.length ? pieces : text;
}

function linkifyNode(node, keyPrefix = 'text') {
  if (typeof node === 'string') return linkifyText(node, keyPrefix);
  if (!React.isValidElement(node) || node.type === 'a') return node;
  return React.cloneElement(node, {
    ...node.props,
    children: React.Children.map(node.props.children, (child, index) =>
      linkifyNode(child, `${keyPrefix}-${index}`)
    ),
  });
}

function linkedBlock(Tag) {
  return function LinkedBlock({ children }) {
    return <Tag>{React.Children.map(children, (child, index) => linkifyNode(child, `block-${index}`))}</Tag>;
  };
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
    block: {
      normal: linkedBlock('p'),
      h1: linkedBlock('h1'),
      h2: linkedBlock('h2'),
      h3: linkedBlock('h3'),
      h4: linkedBlock('h4'),
      blockquote: linkedBlock('blockquote'),
      ...(overrides.block || {}),
    },
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
