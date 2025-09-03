import React from 'react';
import { motion } from 'framer-motion';

export default function Testimonials({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
      <h3 className="text-heading uppercase mb-6 border-b border-neutral-300 pb-3">Testimonials</h3>
      <div className="grid md:grid-cols-3 gap-6">
        {items.map((t, i) => (
          <motion.blockquote
            key={i}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="p-6 rounded-xl bg-white shadow"
          >
            <p className="text-body italic">“{t.quote}”</p>
            <footer className="mt-4 text-sm text-neutral-600">
              — {t.author}
              {t.context ? <span className="block text-neutral-400 mt-1">{t.context}</span> : null}
            </footer>
          </motion.blockquote>
        ))}
      </div>
    </section>
  );
}
