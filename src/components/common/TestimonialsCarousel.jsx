import React, { useMemo, useState } from 'react';
import EmblaCarousel from './EmblaCarousel';
import { businessInfo } from '../../data/staticContent';

const INLINE_MARKUP_RE = /\[\/?[bi]\]/;
const INLINE_MARKUP_GLOBAL_RE = /\[\/?[bi]\]/g;

function stripInlineMarkup(text) {
  return String(text || '').replace(INLINE_MARKUP_GLOBAL_RE, '');
}

function renderInlineMarkup(text) {
  if (!text) return null;
  const raw = String(text);
  if (!INLINE_MARKUP_RE.test(raw)) return raw;
  const tokens = raw.split(/(\[\/?b\]|\[\/?i\])/);
  const root = { type: null, children: [] };
  const stack = [root];

  tokens.forEach((token) => {
    if (!token) return;
    if (token === '[b]') {
      const node = { type: 'b', children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
      return;
    }
    if (token === '[/b]') {
      if (stack.length > 1) stack.pop();
      return;
    }
    if (token === '[i]') {
      const node = { type: 'i', children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
      return;
    }
    if (token === '[/i]') {
      if (stack.length > 1) stack.pop();
      return;
    }
    stack[stack.length - 1].children.push(token);
  });

  let key = 0;
  const renderNodes = (node) => node.children.map((child) => {
    if (typeof child === 'string') return child;
    const Tag = child.type === 'b' ? 'strong' : 'em';
    return (
      <Tag key={`inline-${key++}`}>
        {renderNodes(child)}
      </Tag>
    );
  });

  return renderNodes(root);
}

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function TestimonialsCarousel({ items = [], title = 'Testimonials', headingExtra = null, maxLines = 5 }) {
  function parseDateFromContext(ctx) {
    if (!ctx) return undefined;
    const m = String(ctx).match(/[A-Za-z]{3,9} \d{1,2}, \d{4}/);
    if (!m) return undefined;
    const d = new Date(m[0]);
    if (isNaN(d)) return undefined;
    return d.toISOString().slice(0, 10);
  }

  const reviewsJsonLd = useMemo(() => {
    if (!items || !items.length) return null;
    const subj = {
      '@type': 'ProfessionalService',
      name: businessInfo.name || 'Local Effort',
      url: businessInfo.url || 'https://localeffortfood.com/'
    };
  const graph = items.slice(0, 20).map((t) => ({
      '@type': 'Review',
      reviewBody: stripInlineMarkup(String(t.quote || '')).trim(),
      author: { '@type': 'Person', name: t.author || 'Customer' },
      reviewRating: /5★/.test(String(t.context || '')) ? { '@type': 'Rating', ratingValue: 5, bestRating: 5 } : undefined,
      publisher: t.context ? { '@type': 'Organization', name: String(t.context).split('·')[0].trim() } : undefined,
      datePublished: parseDateFromContext(t.context),
      itemReviewed: subj
    }));
    return { '@context': 'https://schema.org', '@graph': graph };
  }, [items]);
  const slides = useMemo(() => {
    if (!items.length) return [];
    const randomized = shuffle(items);
    const groups = chunk(randomized, 3);
    return groups.map((group, idx) => ({
      key: `t-slide-${idx}`,
      node: (
        <div className="grid md:grid-cols-3 gap-6">
          {group.map((t, i) => (
            <TestimonialCard key={i} t={t} maxLines={maxLines} />
          ))}
        </div>
      ),
    }));
  }, [items]);

  if (!slides.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
      {reviewsJsonLd && (
        <script type="application/ld+json">{JSON.stringify(reviewsJsonLd)}</script>
      )}
      <div className="mb-6 border-b border-neutral-300 pb-3 flex items-end justify-between gap-3">
        <h3 className="text-heading uppercase">{title}</h3>
        {headingExtra}
      </div>
      <EmblaCarousel slides={slides} autoPlayMs={7000} contain={false} heightClass="h-auto" showThumbs={false} />
    </section>
  );
}

function TestimonialCard({ t, maxLines = 5 }) {
  const [expanded, setExpanded] = useState(false);
  const rawQuote = String(t.quote || '').trim();
  const plainQuote = stripInlineMarkup(rawQuote);
  const author = t.author || 'Anonymous';
  const context = t.context;
  return (
    <blockquote className="p-6 rounded-xl bg-white shadow flex flex-col">
      <p
        className={`text-body italic ${expanded ? '' : 'line-clamp-' + maxLines}`}
        style={!expanded ? { display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
      >
        "{renderInlineMarkup(rawQuote)}"
      </p>
      {plainQuote.length > 220 && (
        <button className="mt-2 text-sm underline self-start" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? 'See less' : 'See more'}
        </button>
      )}
      <footer className="mt-4 text-sm text-neutral-600">
        — {author}
        {context ? <span className="block text-neutral-400 mt-1">{context}</span> : null}
      </footer>
    </blockquote>
  );
}
