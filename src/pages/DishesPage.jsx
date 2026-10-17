import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import snapshot from '../store/data/generatedMenuLibrary.json';
import vocab from '../config/menuVocabulary.json';
import { SITE_URL } from '../config/siteMetadata';
import '../styles/specimen.css';
import '../styles/dishes.css';

// Dish text and facts come from the hub dish library (Prisma Dish) through the generated snapshot.
// Page copy comes from the optional `dishLibraryPage` Sanity document; nothing below is invented
// when that document is missing. Group and filter labels are the shared vocabulary.
const PAGE_URL = `${SITE_URL}/dishes`;
const DEFAULT_HEADING = 'Dishes';
const label = (list, id) => list.find((x) => x.id === id)?.label || id;

export function groupByCourse(dishes) {
  return vocab.courses
    .map((course) => ({ ...course, dishes: dishes.filter((d) => (d.courses[0] || 'main') === course.id) }))
    .filter((group) => group.dishes.length);
}

export function menuJsonLd(dishes, name) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name,
    url: PAGE_URL,
    hasMenuSection: groupByCourse(dishes).map((group) => ({
      '@type': 'MenuSection',
      name: group.label,
      hasMenuItem: group.dishes.map((d) => {
        const item = { '@type': 'MenuItem', name: d.title };
        if (d.description) item.description = d.description;
        const diets = d.diets.map((id) => vocab.diets.find((x) => x.id === id)?.schemaOrg).filter(Boolean);
        if (diets.length) item.suitableForDiet = diets;
        return item;
      }),
    })),
  };
}

function Toggle({ list, active, counts, onToggle, name }) {
  const options = list.filter((x) => counts[x.id]);
  if (!options.length) return null;
  return (
    <fieldset className="dishes__facet">
      <legend>{name}</legend>
      {options.map((x) => (
        <label key={x.id}>
          <input type="checkbox" checked={active.includes(x.id)} onChange={() => onToggle(x.id)} />
          {x.label} <span className="dishes__count">{counts[x.id]}</span>
        </label>
      ))}
    </fieldset>
  );
}

const countBy = (dishes, key) => dishes.reduce((acc, d) => {
  for (const id of d[key]) acc[id] = (acc[id] || 0) + 1;
  return acc;
}, {});

export default function DishesPage() {
  const { dishes, page } = snapshot;
  const [diets, setDiets] = useState([]);
  const [proteins, setProteins] = useState([]);
  const toggle = (set) => (id) => set((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const shown = useMemo(
    () => dishes.filter((d) => diets.every((x) => d.diets.includes(x)) && (!proteins.length || proteins.some((x) => d.proteins.includes(x)))),
    [dishes, diets, proteins],
  );
  const groups = groupByCourse(shown);
  const heading = page?.title || DEFAULT_HEADING;
  const title = `${heading} | Local Effort Cooperative`;
  const description = page?.metaDescription || page?.introduction || '';

  return (
    <div className="fullpage-demo-scope specimen dishes">
      <Helmet>
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
        {description && <meta property="og:description" content={description} />}
        <meta property="og:title" content={title} />
        <meta property="og:url" content={PAGE_URL} />
        <link rel="canonical" href={PAGE_URL} />
        {!dishes.length && <meta name="robots" content="noindex" />}
        {dishes.length > 0 && <script type="application/ld+json">{JSON.stringify(menuJsonLd(dishes, heading))}</script>}
      </Helmet>

      <main>
        <section className="dishes__head specimen-sheet" aria-labelledby="dishes-title">
          <h1 id="dishes-title">{heading}</h1>
          {page?.introduction && <p>{page.introduction}</p>}
          {!dishes.length && page?.emptyNotice && <p>{page.emptyNotice}</p>}
          {(page?.bookLabel || page?.weeklyMealsLabel) && (
            <p className="dishes__links">
              {page.bookLabel && <Link to="/book">{page.bookLabel}</Link>}
              {page.weeklyMealsLabel && <Link to="/weekly-meals">{page.weeklyMealsLabel}</Link>}
            </p>
          )}
        </section>

        {dishes.length > 0 && (
          <section className="dishes__body specimen-sheet" aria-label={heading}>
            <nav className="dishes__rail" aria-label="Courses">
              <ul>
                {groupByCourse(dishes).map((g) => (
                  <li key={g.id}><a href={`#course-${g.id}`}>{g.label}</a></li>
                ))}
              </ul>
              <Toggle name="Diet" list={vocab.diets} active={diets} counts={countBy(dishes, 'diets')} onToggle={toggle(setDiets)} />
              <Toggle name="Protein" list={vocab.proteins} active={proteins} counts={countBy(dishes, 'proteins')} onToggle={toggle(setProteins)} />
            </nav>

            <div className="dishes__list">
              {groups.map((g) => (
                <section key={g.id} id={`course-${g.id}`} aria-labelledby={`course-${g.id}-title`}>
                  <h2 id={`course-${g.id}-title`}>{g.label}</h2>
                  <ul>
                    {g.dishes.map((d) => (
                      <li key={d.slug}>
                        <h3>{d.title}</h3>
                        {d.description && <p>{d.description}</p>}
                        {(d.diets.length > 0 || d.proteins.length > 0) && (
                          <p className="dishes__facts">
                            {[...d.diets.map((x) => label(vocab.diets, x)), ...d.proteins.map((x) => label(vocab.proteins, x))].join(' · ')}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {!groups.length && <p>No dish matches those filters.</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
