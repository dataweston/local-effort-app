import React from 'react';
import vocab from '../../config/menuVocabulary.json';

const COURSE_LABEL = Object.fromEntries(vocab.courses.map((c) => [c.id, c.label]));
const COURSE_ORDER = vocab.courses.map((c) => c.id);

export function sortSections(sections) {
  return [...sections].sort((a, b) => COURSE_ORDER.indexOf(a.course) - COURSE_ORDER.indexOf(b.course));
}

/**
 * The menu as the guest reads it: title, optional occasion line, courses with dish wordings.
 * Never renders prices, client names or provenance. Printed via the ml-print rules in
 * hub-menu-library.css.
 */
export default function MenuSheet({ title, occasion, guests, sections, notes }) {
  const filled = sortSections((sections || []).filter((s) => s.items?.length));
  return (
    <article className="ml-sheet ml-print" aria-label="Menu sheet">
      <header>
        <p className="ml-sheet-house">Local Effort Cooperative</p>
        <h2>{title || 'Untitled menu'}</h2>
        {(occasion || guests) && <p className="ml-sheet-line">{[occasion, guests && `for ${guests}`].filter(Boolean).join(' · ')}</p>}
      </header>
      {filled.length === 0 && <p className="ml-empty">No dishes on this menu yet.</p>}
      {filled.map((s) => (
        <section key={s.course}>
          <h3>{COURSE_LABEL[s.course] || s.course}</h3>
          <ul>
            {s.items.map((it, i) => <li key={`${it.dishId || it.title}-${i}`}>{it.wording || it.title}</li>)}
          </ul>
        </section>
      ))}
      {notes && <p className="ml-sheet-notes">{notes}</p>}
    </article>
  );
}
