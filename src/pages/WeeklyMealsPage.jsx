// src/pages/WeeklyMealsPage.jsx
//
// /weekly-meals — broken out of the home page's horizontal tab format so the
// meal-prep offer has its own indexable URL, canonical, and JSON-LD. The home
// page now teases this page instead of duplicating it.
//
// Material system: .ht-scope--meals in src/styles/home-tabs.css (olive accent,
// hand-ruled slip). Direction: src/components/fullpage/HOME-TABS-DESIGN.md
import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import CloudinaryImage from '../components/common/cloudinaryImage';
import { MealPrepQuickStart } from '../components/services/slipForms';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';
import '../styles/home-tabs.css';
import '../styles/service-page.css';

const RECENT_MEAL_PREP_MENUS = [
  {
    label: 'July 5/6',
    sections: [
      {
        label: 'Dinners',
        items: [
          'Pulled pork with cabbage, rainbow chard, potato salad or rice, and pickles',
          'Nam tok waterfall beef with sticky rice, shiso, cucumbers, and marinated sirloin',
          'Dan dan noodles with minced pork, chili oil, sunflower seeds, green onion, and braised choy — gluten-free where appropriate',
        ],
      },
      { label: 'Kids', items: ['Squash fritters', 'Strawberry crêpes'] },
      { label: 'Snack', items: ['Mango coconut sticky rice'] },
    ],
  },
  {
    label: 'June 28/29',
    sections: [
      {
        label: 'Dinners',
        items: [
          'Zabuton roast, pot-roast style, with new red potatoes and green bean casserole',
          'Mango-glazed BBQ chicken with green bean salad and new potato salad',
          'Pork loin over quinoa with prunes and snap pea salad',
        ],
      },
      {
        label: 'Lunches',
        items: [
          'Niçoise salad with lettuce, marinated fish, egg, olives, and green beans',
          'Poke bowl with sushi rice, sesame, mustard kimchi, tuna or salmon, cucumber, and radish',
          '“Ikea” lunch with meatballs, gravy, jam, mashed potatoes, and English peas',
        ],
      },
    ],
  },
];

// The questions people actually ask before their first week. Answering them on
// the page (not in an email thread) is what moves a visitor to the form.
const FAQ_ITEMS = [
  {
    q: 'How does the first week work?',
    a: 'You sign up here, we email the intake form, and we talk once — household size, what you like, what you cannot eat, and which day works for delivery. Your first delivery is usually the following week.',
  },
  {
    q: 'What does a week actually cost?',
    a: 'Dinners are $18 per adult at the family rate (3+ adults), $24 solo, $45 for two. Breakfasts are $13.50 per adult and lunches $18. Delivery is a flat $10 a week. A solo plan lands around $82 a week including delivery.',
  },
  {
    q: 'Do I have to take every meal, every week?',
    a: 'No. Some households take three dinners a week, some replace every meal. You set the number and can change it week to week.',
  },
  {
    q: 'Can you cook around allergies and diets?',
    a: 'Yes — gluten-free, dairy-free, vegetarian, and allergy-safe cooking are routine for us. Dietary needs go on the intake form and stay on your household file.',
  },
  {
    q: 'Do I need to be a Localist member?',
    a: 'Yes. Meal prep customers are co-op members first — it is how we plan, buy from local farms with confidence, and pay our worker-owners fairly. Membership is $45/month or $375/year, and it is waived for anyone for whom the cost is a barrier.',
  },
  {
    q: 'Where do you deliver?',
    a: 'Across the Minneapolis–St. Paul metro. If you are on the edge of the metro, ask — we will tell you honestly whether we can reach you well.',
  },
];

const WeeklyMealsPage = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/search-images?query=mealplan&per_page=24');
        if (!res.ok) throw new Error('Unable to load photos');
        const data = await res.json();
        if (!cancelled) setImages(Array.isArray(data.images) ? data.images : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Unable to load photos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const structuredData = useMemo(
    () => JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'FoodService',
          '@id': `${SITE_URL}/weekly-meals#service`,
          name: 'Local Effort Cooperative — Weekly Meal Prep',
          url: `${SITE_URL}/weekly-meals`,
          description: 'Weekly personal-chef meal prep delivered across Minneapolis–St. Paul. Home-cooked breakfasts, lunches, and dinners from locally sourced Minnesota ingredients. Family dinners from $18 per person; solo plans from about $82 per week including delivery.',
          provider: { '@id': `${SITE_URL}#business` },
          areaServed: [
            { '@type': 'City', name: 'Minneapolis' },
            { '@type': 'City', name: 'Saint Paul' },
            { '@type': 'Place', name: 'Twin Cities Metro, Minnesota' },
          ],
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Weekly Meal Prep',
            itemListElement: [
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Weekly Dinners',
                  description: 'Home-cooked dinners delivered weekly. $18 per adult for family dinners (3+ adults), $24 solo, $45 for two. Kids priced by age.',
                  serviceType: 'Personal chef meal prep',
                  category: 'Meal Preparation',
                },
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  priceCurrency: 'USD',
                  price: '18',
                  unitText: 'per adult per dinner (family rate)',
                },
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Weekly Breakfasts & Lunches',
                  description: 'Breakfasts at $13.50 per adult and lunches at $18 per adult, delivered with your weekly order.',
                  serviceType: 'Personal chef meal prep',
                  category: 'Meal Preparation',
                },
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  priceCurrency: 'USD',
                  price: '13.50',
                  unitText: 'per adult per breakfast',
                },
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Weekly Delivery',
                  description: 'Flat weekly delivery across the Twin Cities metro.',
                  serviceType: 'Food delivery',
                  category: 'Meal Preparation',
                },
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  priceCurrency: 'USD',
                  price: '10',
                  unitText: 'per weekly delivery',
                },
              },
            ],
          },
        },
        {
          '@type': 'WebPage',
          '@id': `${SITE_URL}/weekly-meals`,
          name: 'Weekly Meal Prep Delivery in Minneapolis–St. Paul | Local Effort Cooperative',
          description: 'Weekly personal-chef meal prep delivered in the Twin Cities. Dinners from $18 per person. Sign up online in under a minute.',
          isPartOf: { '@id': `${SITE_URL}#website` },
          about: { '@id': `${SITE_URL}/weekly-meals#service` },
        },
        {
          '@type': 'FAQPage',
          mainEntity: FAQ_ITEMS.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        },
      ],
    }),
    [],
  );

  const heroImage = images[0];
  const gridImages = images.slice(1);
  // The gallery API is the nice case; if it is slow or down the hero must not
  // leave half the fold empty, so there is always a print beside the slip.
  const heroFallback = 'https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/n4xtzathcmkkqdzq5im4';

  return (
    <div className="fullpage-demo-scope service-page">
      <Helmet>
        <title>Weekly Meal Prep Delivery in Minneapolis–St. Paul | {SITE_NAME}</title>
        <meta
          name="description"
          content="Weekly personal-chef meal prep delivered across Minneapolis–St. Paul. Home-cooked dinners from $18 a person, breakfasts from $13.50, from Minnesota-grown ingredients. Sign up in under a minute."
        />
        <link rel="canonical" href={`${SITE_URL}/weekly-meals`} />
        <script type="application/ld+json">{structuredData}</script>
      </Helmet>

      <div className="ht-scope ht-scope--meals is-drawn service-page__body">
        {/* ── The offer + the form, above the fold ── */}
        <section className="service-hero">
          <div className="ht-slip">
            <p className="ht-kicker">weekly meals —</p>
            <h1 className="ht-heading">A week of real food, cooked for you</h1>
            <span className="ht-rule-line" aria-hidden="true" />
            <p className="ht-copy">
              From a few dinners a week to complete meal replacement — wholesome, home-cooked
              meals from high-integrity Midwest ingredients, delivered to your door every week.
            </p>
            <p className="ht-facts">
              dinners from $18 a person · breakfasts from $13.50 · $10 weekly delivery
            </p>
            <MealPrepQuickStart source="weekly-meals-page" />
            <div className="ht-side-links">
              <a className="ht-side-link" href="/meal-prep-intake">
                Prefer to plan every detail? Take the full intake
              </a>
              <a className="ht-side-link" href="/localist">
                Meal prep customers are co-op members — see what membership means
              </a>
            </div>
          </div>
          <div className="ht-hero-photo service-hero__photo">
            {heroImage?.thumbnail_url ? (
              <img
                src={heroImage.thumbnail_url}
                alt={heroImage.context?.alt || 'A week of Local Effort meals'}
                loading="eager"
              />
            ) : heroImage ? (
              <CloudinaryImage
                publicId={heroImage.public_id || heroImage.publicId}
                alt={heroImage.context?.alt || 'A week of Local Effort meals'}
                width={900}
              />
            ) : (
              <img src={heroFallback} alt="A week of Local Effort meals" loading="eager" />
            )}
          </div>
        </section>

        {/* ── Proof: real menus, not a promise ── */}
        <section className="ht-recent-menus" aria-labelledby="recent-meal-prep-menus">
          <div className="ht-recent-menus__intro">
            <p className="ht-kicker">recent menus —</p>
            <h2 id="recent-meal-prep-menus">What clients have eaten lately</h2>
            <p>
              These are real recent examples. Your weekly menu is shaped around your household,
              preferences, dietary needs, and what Minnesota farms are producing.
            </p>
          </div>
          <div className="ht-recent-menus__weeks">
            {RECENT_MEAL_PREP_MENUS.map((menu, menuIndex) => (
              <details className="ht-recent-menu" key={menu.label} open={menuIndex === 0}>
                <summary>
                  <span>Week of {menu.label}</span>
                  <span className="ht-recent-menu__hint">see menu</span>
                </summary>
                <div className="ht-recent-menu__body">
                  {menu.sections.map((section) => (
                    <div className="ht-recent-menu__section" key={section.label}>
                      <h4>{section.label}</h4>
                      <ul>
                        {section.items.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Pricing, stated plainly ── */}
        <section className="service-pricing" aria-labelledby="weekly-meals-pricing">
          <p className="ht-kicker">pricing —</p>
          <h2 id="weekly-meals-pricing">What a week costs</h2>
          <div className="ht-ledger">
            <div className="ht-ledger-cat">dinners, per adult</div>
            <div className="ht-ledger-row"><span>family rate (3+ adults)</span><span className="ht-ledger-price">$18</span></div>
            <div className="ht-ledger-row"><span>two adults</span><span className="ht-ledger-price">$45</span></div>
            <div className="ht-ledger-row"><span>solo</span><span className="ht-ledger-price">$24</span></div>
            <div className="ht-ledger-cat">other meals, per adult</div>
            <div className="ht-ledger-row"><span>breakfast</span><span className="ht-ledger-price">$13.50</span></div>
            <div className="ht-ledger-row"><span>lunch</span><span className="ht-ledger-price">$18</span></div>
            <div className="ht-ledger-cat">delivery</div>
            <div className="ht-ledger-row"><span>flat weekly delivery, Twin Cities metro</span><span className="ht-ledger-price">$10</span></div>
          </div>
          <p className="ht-footnote">
            Kids are priced by age. A solo plan lands around $82 a week including delivery.
          </p>
        </section>

        {/* ── FAQ ── */}
        <section className="service-faq" aria-labelledby="weekly-meals-faq">
          <p className="ht-kicker">questions —</p>
          <h2 id="weekly-meals-faq">Before your first week</h2>
          <div className="service-faq__list">
            {FAQ_ITEMS.map((item) => (
              <details className="ht-recent-menu" key={item.q}>
                <summary>
                  <span>{item.q}</span>
                  <span className="ht-recent-menu__hint">answer</span>
                </summary>
                <div className="ht-recent-menu__body">
                  <p className="ht-copy" style={{ marginTop: 0 }}>{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Photos ── */}
        <section className="service-gallery">
          {loading && <p className="ht-footnote">Loading photos…</p>}
          {error && <p className="ht-footnote">{error}</p>}
          {!loading && !error && gridImages.length > 0 && (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
              {gridImages.map((img, idx) => (
                <div
                  key={(img.asset_id || img.public_id || idx) + ':' + idx}
                  className="ht-polaroid mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden"
                >
                  {img.thumbnail_url ? (
                    <img
                      src={img.thumbnail_url}
                      alt={img.context?.alt || 'Local Effort meal prep'}
                      className="rounded-lg w-full h-auto"
                      loading="lazy"
                    />
                  ) : (
                    <CloudinaryImage
                      publicId={img.public_id || img.publicId}
                      alt={img.context?.alt || 'Local Effort meal prep'}
                      width={800}
                      className="rounded-lg w-full h-auto"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── The ask, again, at the end ── */}
        <section className="service-close">
          <div className="ht-slip">
            <p className="ht-kicker">start —</p>
            <h2 className="ht-heading">Let&apos;s plan your first week</h2>
            <span className="ht-rule-line" aria-hidden="true" />
            <p className="ht-copy">
              Name and email is all we need. A chef replies within one business day.
            </p>
            <MealPrepQuickStart source="weekly-meals-page-close" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default WeeklyMealsPage;
