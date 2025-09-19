import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ModernButton } from '../components/ui/ModernButton';
import PhotoGrid from '../components/common/PhotoGrid';
import Divider from '../components/Divider';
import AspectRatio from '../components/AspectRatio';
import ChefCard from '../components/ChefCard';
import CredibilityStrip from '../components/CredibilityStrip';

const AboutUsPage = () => {
  const services = [
    'Meal planning and nutrition support for families',
    'Sourcing and shopping directly from Minnesota producers',
    'Catering and events built around local ingredients',
    'Completely local pizzas — our specialty',
  ];
  const chefs = [
    {
      name: 'Chef Weston Smith',
      bio:
        'Began in coffee in Portland, trained in fine dining in New York, opened Weston Fine Foods (a chocolate shop in the North Loop during the pandemic), and has been focused on Local Effort since 2022.',
      imageSrc: '/images/weston.jpg',
      imageAlt: 'Chef Weston Smith',
    },
    {
      name: 'Chef Catherine Olsen',
      bio:
        'Born and raised in Minneapolis. A skilled baker with a lifelong career in food, including Wuollet Bakery, Lucia’s, and Churchill Street. She brings warmth, craft, and deep local roots to our kitchen.',
      imageSrc: '/images/catherine.jpg',
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
            "Stubbornly local since 2022 — because it’s healthier, tastier, and better for Minnesota."
          }
        />
        <meta property="og:title" content="About | Local Effort" />
        <meta property="og:description" content="Stubbornly local since 2022 — because it’s healthier, tastier, and better for Minnesota." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.localeffortfood.com/images/team-hero.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About | Local Effort" />
        <meta name="twitter:description" content="Stubbornly local since 2022 — because it’s healthier, tastier, and better for Minnesota." />
        <meta name="twitter:image" content="https://www.localeffortfood.com/images/team-hero.jpg" />
      </Helmet>

      <main id="main" className="container-page">
        <article className="space-y-16 md:space-y-24" aria-labelledby="about-hero-title">
          <header className="grid gap-8 md:grid-cols-2 md:items-center rounded-2xl bg-gradient-to-br from-rose-50/60 to-transparent p-6 md:p-10 ring-1 ring-neutral-200">
            <div>
              <h1 id="about-hero-title" className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">Local Effort</h1>
              <p className="mt-4 text-lg text-neutral-700">
                Stubbornly local since 2022 — because it’s healthier, tastier, and better for Minnesota.
              </p>
            </div>
            <div className="w-full">
              <AspectRatio ratio={4/3} className="rounded-xl shadow-sm ring-1 ring-neutral-200 max-h-[480px]">
                <img
                  src="/images/team-hero.jpg"
                  alt="Local Effort chefs cooking"
                  width={1600}
                  height={1200}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AspectRatio>
            </div>
          </header>

          <CredibilityStrip />

          <Divider />

          {/* Our Story */}
          <section aria-labelledby="our-story-title" className="space-y-4">
            <h2 id="our-story-title" className="text-heading">Our Story</h2>
            <p className="prose-lite max-w-3xl">
              We began in Minneapolis in 2022 with one simple, stubborn idea: eat local first, no matter the cost. Local and seasonal eating is good for our health, good for our economy, and good for our community. That commitment shapes everything we do today.
            </p>
          </section>

          <Divider />

          {/* What We Do */}
          <section aria-labelledby="what-we-do-title" className="space-y-4">
            <h2 id="what-we-do-title" className="text-heading">What We Do</h2>
            <p className="prose-lite max-w-3xl">{whatWeDoMicrocopy}</p>
            <ul className="list-disc pl-6 max-w-3xl text-neutral-800">
              {services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          {/* Photo galleries — moved after What We Do for context */}
          <section aria-label="Photo galleries" className="space-y-10">
            <div className="grid gap-6 md:grid-cols-2">
              {photoGrids.map((pg) => (
                <div key={pg.id} className="card">
                  <h3 id={pg.id} className="text-lg font-semibold">{pg.title}</h3>
                  <PhotoGrid
                    tags={pg.tags}
                    perPage={pg.perPage}
                    aria-labelledby={pg.id}
                  />
                </div>
              ))}
            </div>
          </section>

          <Divider />

          {/* Meet the Chefs */}
          <section aria-labelledby="meet-chefs-title" className="space-y-6">
            <h2 id="meet-chefs-title" className="text-heading">Meet the Chefs</h2>
            <div className="grid gap-8 md:grid-cols-2">
              {chefs.map((c) => (
                <ChefCard key={c.name} name={c.name} bio={c.bio} imageSrc={c.imageSrc} imageAlt={c.imageAlt} />
              ))}
            </div>
          </section>

          <Divider />

          {/* What We Value */}
          <section aria-labelledby="values-title" className="space-y-4">
            <h2 id="values-title" className="text-heading">What We Value</h2>
            <ul className="list-disc pl-6 max-w-3xl text-neutral-800">
              <li>Celebrating home cooks</li>
              <li>Supporting family nutrition</li>
              <li>Spending with local producers</li>
              <li>Collaborating with Minnesota organizations</li>
              <li>Sharing and shaping Minnesota food culture</li>
            </ul>
          </section>

          <Divider />

          {/* Why Work With Us */}
          <section aria-labelledby="why-us-title" className="space-y-4">
            <h2 id="why-us-title" className="text-heading">Why Work With Us</h2>
            <p className="prose-lite max-w-3xl">
              Clients trust us for our professional experience, pride in ingredients, and equal care for nutrition and flavor. We keep presentation humble, but our food — and our commitment to your happiness — is anything but.
            </p>
          </section>

          {/* Call to Action */}
          <section aria-labelledby="cta-title" className="space-y-6">
            <h2 id="cta-title" className="text-heading">Let’s Cook Something Local</h2>
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
