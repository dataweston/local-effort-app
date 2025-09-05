import React, { useMemo, useState } from 'react';
import EmblaCarousel from './EmblaCarousel';

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
  const quote = String(t.quote || '').trim();
  const author = t.author || 'Anonymous';
  const context = t.context;
  return (
    <blockquote className="p-6 rounded-xl bg-white shadow flex flex-col">
      <p
        className={`text-body italic ${expanded ? '' : 'line-clamp-' + maxLines}`}
        style={!expanded ? { display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
      >
        “{quote}”
      </p>
      {quote.length > 220 && (
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
