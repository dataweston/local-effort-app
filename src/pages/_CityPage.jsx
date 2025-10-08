import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';

const CityPage = ({ city, h1, description, canonical, images, faq }) => {
  const isMinneapolis = city?.toLowerCase() === 'minneapolis';
  const title = `${city} Personal Chef — Local Effort Food Co. | In-home Chef • Event Catering`;
  const metaDesc = description;
  const imageJsonLd = images.map((img) => ({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: img.src,
    thumbnail: img.thumb || img.src,
    name: img.alt,
    description: img.caption || img.alt,
    copyrightHolder: "Local Effort Food Co."
  }));
  const serviceLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Local Effort Food Co.",
    url: canonical,
    description: metaDesc,
    areaServed: ["Minneapolis", "St. Paul", "Roseville", "Twin Cities"],
    priceRange: "$$",
    service: {
      "@type": "Service",
      name: "Personal Chef (In-home)",
      description: "Private chef dinners, meal prep, and event catering in the Twin Cities metro."
    }
  }), [canonical, metaDesc]);

  const businessLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Local Effort Food Co.",
    url: canonical,
    description: metaDesc,
    address: {
      "@type": "PostalAddress",
      "addressLocality": "Minneapolis",
      "addressRegion": "MN",
      "addressCountry": "US"
    },
    areaServed: ["Minneapolis", "St. Paul", "Roseville", "Twin Cities"],
    priceRange: "$$"
  }), [canonical, metaDesc]);
  const faqLd = faq ? ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a }
    }))
  }) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-10">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        {imageJsonLd.map((obj, i) => (
          <script key={`img-${i}`} type="application/ld+json">{JSON.stringify(obj)}</script>
        ))}
        <script type="application/ld+json">{JSON.stringify(serviceLd)}</script>
        <script type="application/ld+json">{JSON.stringify(businessLd)}</script>
        {faqLd && <script type="application/ld+json">{JSON.stringify(faqLd)}</script>}
      </Helmet>

      <h1 className="heading-xl heading-balance mb-4">{h1}</h1>
      <h2 className="heading-subtitle text-neutral-600 mb-6">In-home private chef dinners • Weekly meal prep • Small event catering</h2>

      <div className="prose prose-neutral max-w-none">
        <p>{metaDesc}</p>
        <p>
          We source locally and cook seasonally. From intimate in-home dinners to small events and weekly
          meal prep, our menus highlight Minnesota farms and producers. We regularly serve {city} neighborhoods
          and the broader Twin Cities area.
        </p>
        {isMinneapolis && (
          <p>
            Searching for a personal chef Minneapolis team that can also handle weekly cooking? Local Effort delivers
            multi-course dinners, tasting menus, and chef-led activations throughout the city while coordinating pantry
            stocking, cocktail pairings, and staffing when needed.
          </p>
        )}
        <ul>
          <li>Farm-to-table menus tailored to your tastes</li>
          <li>Dietary accommodations (GF, DF, vegetarian, etc.)</li>
          <li>Shopping, on-site prep, service, and cleanup included</li>
        </ul>
        {isMinneapolis && (
          <p>
            Need meal prep Minneapolis support between events? Ask about our Foundation Plan or a custom meal plan
            Minneapolis subscription—both provide reheatable dishes, labeled storage, and nutrition notes that keep your
            week organized.
          </p>
        )}
        <p>
          Recent work in {city}: chef’s tasting dinners, milestone birthdays, small weddings, and cabin weekends.
          Ask about seasonal ingredients like walleye, Lake Superior trout, wild rice, and Midwestern produce.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        {images.map((img, idx) => {
          const src = img.src || img.fallback;
          const src400 = img.src400 || img.fallback;
          const src800 = img.src800 || img.fallback;
          const src1200 = img.src1200 || img.fallback;
          const handleError = (event) => {
            if (!img.fallback) return;
            const target = event.currentTarget;
            if (target.dataset.fallbackApplied === 'true') return;
            target.dataset.fallbackApplied = 'true';
            target.src = img.fallback;
            target.srcset = '';
            target.sizes = '';
          };
          return (
            <figure key={idx} className="gallery-item">
              <img
                src={src}
                srcSet={`${src400} 400w, ${src800} 800w, ${src1200} 1200w`}
                sizes="(max-width:600px) 100vw, 33vw"
                loading="lazy"
                decoding="async"
                width="1200"
                height="800"
                alt={img.alt}
                className="w-full h-auto rounded"
                onError={handleError}
              />
              <figcaption className="text-sm text-neutral-600 mt-2">{img.caption || img.alt}</figcaption>
            </figure>
          );
        })}
      </div>

      <noscript>
        {images.map((img, idx) => (
          <img key={`ns-${idx}`} src={img.src || img.fallback} alt={img.alt} />
        ))}
      </noscript>

      {faq && (
        <section className="mt-10">
          <h3 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {faq.map((q, i) => (
              <div key={i}>
                <p className="font-medium">{q.q}</p>
                <p className="text-neutral-700">{q.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CityPage;
