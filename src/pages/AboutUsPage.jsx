import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ModernButton } from '../components/ui/ModernButton';
import PhotoGrid from '../components/common/PhotoGrid';
import AspectRatio from '../components/AspectRatio';
import ChefCard from '../components/ChefCard';
// import CredibilityStrip from '../components/CredibilityStrip';
import Separator from '../components/ui/Separator';
import SectionHeader from '../components/ui/SectionHeader';

const AboutUsPage = () => {
  const services = [
    'Meal planning and nutrition support for families',
    'Sourcing and shopping directly from Minnesota producers',
    'Catering and events built around local ingredients',
    'Completely local pizzas — our specialty',
  ];
  const specialties = [
    'Seasonal vegetables and composed salads',
    'Fresh pastas, grains, and hearty soups',
    'Local, from-scratch pizzas',
    'Thoughtful braises and shared plates',
    'Breads and simple, elegant desserts',
  ];
  const chefs = [
    {
      name: 'Weston Smith',
      bio:
        'Began in coffee in Portland, trained in fine dining in New York, opened Weston Fine Foods (a chocolate shop in the North Loop during the pandemic), and has been focused on Local Effort since 2022.',
  imageSrc: '/gallery/IMG-1013.JPG',
      imageAlt: 'Chef Weston Smith',
    },
    {
      name: 'Catherine Olsen',
      bio:
        'Born and raised in Minneapolis. A skilled baker with a lifelong career in food, including Wuollet Bakery, Lucia’s, and Churchill Street. She brings warmth, craft, and deep local roots to our kitchen.',
      imageSrc: '/gallery/catherine.jpg',
      imageAlt: 'Chef Catherine Olsen',
    },
  ];
  const photoGrids = [
    { id: 'photos-kitchen', tags: ['team', 'kitchen'], title: 'In the kitchen', perPage: 8 },
    { id: 'photos-events', tags: ['event', 'dinner'], title: 'At events', perPage: 8 },
  ];
  const whatWeDoMicrocopy = 'We bring Minnesota-grown ingredients into everyday meals and special events.';
  return (
    <>
      <Helmet>
        <title>About | Local Effort</title>
        <meta
          name="description"
          content={
            "Obsessively local since 2022 — because it’s healthier, tastier, and better for Minnesota."
          }
        />
        <meta property="og:title" content="About | Local Effort" />
  <meta property="og:description" content="Obsessively local since 2022 — because it’s healthier, tastier, and better for Minnesota." />
        <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.localeffortfood.com/gallery/5Z0A5729-Edit.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About | Local Effort" />
  <meta name="twitter:description" content="Obsessively local since 2022 — because it’s healthier, tastier, and better for Minnesota." />
  <meta name="twitter:image" content="https://www.localeffortfood.com/gallery/5Z0A5729-Edit.jpg" />
      </Helmet>

      <main id="main" className="container-page">
        <article className="space-y-16 md:space-y-24" aria-labelledby="about-hero-title">
          <header className="relative overflow-hidden rounded-2xl ring-1 ring-neutral-200 bg-gradient-to-br from-neutral-50 to-white">
            <div className="grid gap-10 md:grid-cols-2 md:items-center p-8 md:p-12 lg:p-16">
              <div>
                <h1 id="about-hero-title" className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">Local Effort</h1>
                <p className="mt-4 text-lg text-neutral-700 max-w-xl">
                  Obsessively local since 2022 — because it’s healthier, tastier, and better for Minnesota.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 shadow-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span>Since 2022</span>
                </div>
              </div>
              <div className="w-full">
                <AspectRatio ratio={4/3} className="rounded-xl shadow-sm ring-1 ring-neutral-200 max-h-[480px] bg-neutral-100">
                  <img
                    src="/gallery/5Z0A5729-Edit.jpg"
                    alt="Local Effort chefs cooking"
                    width={1600}
                    height={1200}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                </AspectRatio>
              </div>
            </div>
          </header>

          {/* CredibilityStrip removed per request */}

          <Separator />

          {/* Our Story */}
          <section aria-labelledby="our-story-title" className="space-y-4">
            <SectionHeader overline="Background" title="Our Story" />
            <div className="grid gap-6 md:grid-cols-3">
              <p className="prose-lite md:col-span-2">
                We began in Minneapolis in 2022 with one simple, stubborn idea: eat local first, no matter the cost. Local and seasonal eating is good for our health, good for our economy, and good for our community. That commitment shapes everything we do today.
              </p>
              <div className="space-y-2 text-sm text-neutral-700">
                <h3 className="text-base font-semibold text-neutral-900">At a glance</h3>
                <ul className="list-disc pl-5">
                  <li>Founded in 2022</li>
                  <li>Based in Minneapolis, MN</li>
                  <li>100% locally sourced focus</li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          {/* What We Do */}
          <section aria-labelledby="what-we-do-title" className="space-y-4">
            <SectionHeader overline="Capabilities" title="What We Do" />
            <div className="grid gap-6 md:grid-cols-3">
              <p className="prose-lite md:col-span-2">{whatWeDoMicrocopy}</p>
              <div className="space-y-6 text-sm text-neutral-700">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">Foods we specialize in</h3>
                  <ul className="list-disc pl-5 mt-2">
                    {specialties.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">Services we offer</h3>
                  <ul className="list-disc pl-5 mt-2">
                    {services.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Photo galleries — stacked, responsive masonry, 8 images each */}
          <section aria-label="Photo galleries" className="space-y-12">
            {photoGrids.map((pg) => (
              <div key={pg.id}>
                <SectionHeader overline="Gallery" title={pg.title} />
                <PhotoGrid
                  tags={pg.tags}
                  perPage={8}
                  layout="masonry"
                  aria-labelledby={pg.id}
                />
              </div>
            ))}
          </section>

          <Separator />

          {/* Meet the Chefs */}
          <section aria-labelledby="meet-chefs-title" className="space-y-6">
            <SectionHeader overline="Team" title="Meet the Chefs" />
            <div className="grid gap-8 md:grid-cols-2">
              {chefs.map((c) => (
                <ChefCard key={c.name} name={c.name} bio={c.bio} imageSrc={c.imageSrc} imageAlt={c.imageAlt} />
              ))}
            </div>
          </section>

          <Separator />

          {/* What We Value */}
          <section aria-labelledby="values-title" className="space-y-4">
            <SectionHeader overline="Principles" title="What We Value" />
            <div className="grid gap-6 md:grid-cols-3">
              <p className="prose-lite md:col-span-2">
                We care about flavor and nutrition in equal measure. We cook with care, spend with purpose, and look for long-term relationships — with families who invite us in, and with producers who grow the food we serve.
              </p>
              <div className="space-y-2 text-sm text-neutral-700">
                <h3 className="text-base font-semibold text-neutral-900">Principles</h3>
                <ul className="list-disc pl-5">
                  <li>Celebrating home cooks</li>
                  <li>Supporting family nutrition</li>
                  <li>Spending with local producers</li>
                  <li>Collaborating with Minnesota organizations</li>
                  <li>Sharing and shaping Minnesota food culture</li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          {/* What We Mean by Local */}
          <section aria-labelledby="local-title" className="space-y-4">
            <SectionHeader overline="Philosophy" title="What We Mean by Local" />
            <div className="grid gap-6 md:grid-cols-3">
              <p className="prose-lite md:col-span-2">
                “Local” is more than a trend for us — it’s the backbone of how we cook and shop. We prioritize Minnesota-grown ingredients, plan menus around the seasons, and maintain relationships with small producers so we can tell you where your food comes from.
              </p>
              <div className="space-y-2 text-sm text-neutral-700">
                <h3 className="text-base font-semibold text-neutral-900">How we apply it</h3>
                <ul className="list-disc pl-5">
                  <li>Minnesota-first sourcing; regional when sensible</li>
                  <li>Seasonal menus; preserve when possible</li>
                  <li>Direct relationships with farms and mills</li>
                  <li>Reasonable exceptions for essentials (e.g., spices)</li>
                  <li>Transparency: ask us about any ingredient</li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          {/* Why Work With Us */}
          <section aria-labelledby="why-us-title" className="space-y-4">
            <SectionHeader overline="Partner With Us" title="Why Work With Us" />
            <p className="prose-lite max-w-4xl">
              Clients trust us for our professional experience, pride in ingredients, and equal care for nutrition and flavor. We keep presentation humble, but our food — and our commitment to your happiness — is anything but.
            </p>
          </section>

          {/* Call to Action */}
          <section aria-labelledby="cta-title" className="space-y-6">
            <SectionHeader overline="Get Started" title="Let’s Cook Something Local" />
            <p className="prose-lite max-w-3xl">
              We’d love to bring Minnesota-grown food to your table or event.
            </p>
            <div>
              <ModernButton
                as="a"
                href="https://www.localeffortfood.com/services#event-request"
                aria-label="Submit Event Request"
                size="md"
                variant="primary"
              >
                Submit Event Request
              </ModernButton>
            </div>
          </section>
        </article>
      </main>
    </>
  );
};

export default AboutUsPage;
