import React from 'react';

export default function CredibilityStrip({ logos = [], testimonials = [] }) {
  return (
    <section aria-label="Credibility" className="flex flex-col gap-4">
      <div className="inline-flex items-center gap-2 self-start rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 px-3 py-1 text-xs font-medium">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Since 2022
      </div>
      {(logos && logos.length > 0) && (
        <ul className="flex flex-wrap items-center gap-4" aria-label="Partner logos">
          {logos.filter(Boolean).map((logo, idx) => (
            <li key={idx} className="shrink-0 opacity-80 hover:opacity-100 transition">
              {typeof logo === 'string' ? (
                <img src={logo} alt={`Partner logo ${idx + 1}`} width={120} height={40} loading="lazy" className="h-8 w-auto object-contain" />
              ) : (
                logo
              )}
            </li>
          ))}
        </ul>
      )}
      {(testimonials && testimonials.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Testimonials">
          {testimonials.slice(0, 2).map((t, i) => (
            <blockquote key={i} className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
              “{t.quote}” {t.author && <cite className="not-italic text-neutral-500">— {t.author}</cite>}
            </blockquote>
          ))}
        </div>
      )}
    </section>
  );
}
