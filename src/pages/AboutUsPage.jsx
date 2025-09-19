import React from 'react';
import { Helmet } from 'react-helmet-async';
import { cn } from '../lib/utils';
import { ModernButton } from '../components/ui/ModernButton';
import PhotoGrid from '../components/common/PhotoGrid';

const AboutUsPage = () => {
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
      </Helmet>

      <article className="container-page space-y-16 md:space-y-24" aria-labelledby="about-hero-title">
        {/* Hero */}
        <section className="grid gap-8 md:grid-cols-2 md:items-center rounded-2xl bg-gradient-to-br from-rose-50/60 to-transparent p-6 md:p-10 ring-1 ring-neutral-200">
          <div>
            <h1 id="about-hero-title" className="text-hero">Local Effort</h1>
            <p className="mt-4 text-lg text-neutral-700">
              Stubbornly local since 2022 — because it’s healthier, tastier, and better for Minnesota.
            </p>
          </div>
          <div className="relative w-full h-full">
            <img
              src="/images/team-hero.jpg"
              alt="Local Effort chefs cooking"
              className={cn(
                'w-full h-64 md:h-full object-cover rounded-xl shadow-sm ring-1 ring-neutral-200'
              )}
              loading="lazy"
            />
          </div>
        </section>

        <div className="h-px bg-neutral-200" />

        {/* Our Story */}
        <section aria-labelledby="our-story-title" className="space-y-4">
          <h2 id="our-story-title" className="text-heading">Our Story</h2>
          <p className="prose-lite max-w-3xl">
            We began in Minneapolis in 2022 with one simple, stubborn idea: eat local first, no matter the cost. Local and seasonal eating is good for our health, good for our economy, and good for our community. That commitment shapes everything we do today.
          </p>
        </section>

        <div className="h-px bg-neutral-200" />

        {/* What We Do */}
        <section aria-labelledby="what-we-do-title" className="space-y-4">
          <h2 id="what-we-do-title" className="text-heading">What We Do</h2>
          <ul className="list-disc pl-6 max-w-3xl text-neutral-800">
            <li>Meal planning and nutrition support for families</li>
            <li>Sourcing and shopping directly from Minnesota producers</li>
            <li>Catering and events built around local ingredients</li>
            <li>Completely local pizzas — our specialty</li>
          </ul>
        </section>

        <div className="h-px bg-neutral-200" />

        {/* Meet the Chefs */}
        <section aria-labelledby="meet-chefs-title" className="space-y-6">
          <h2 id="meet-chefs-title" className="text-heading">Meet the Chefs</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <article className="card">
              <div className="relative w-full overflow-hidden rounded-md ring-1 ring-neutral-200" style={{ paddingTop: '75%' }}>
                <img
                  src="/images/weston.jpg"
                  alt="Chef Weston Smith"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Chef Weston Smith</h3>
              <p className="mt-2 text-neutral-800">
                Began in coffee in Portland, trained in fine dining in New York, opened Weston Fine Foods (a chocolate shop in the North Loop during the pandemic), and has been focused on Local Effort since 2022.
              </p>
            </article>

            <article className="card">
              <div className="relative w-full overflow-hidden rounded-md ring-1 ring-neutral-200" style={{ paddingTop: '75%' }}>
                <img
                  src="/images/catherine.jpg"
                  alt="Chef Catherine Olsen"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Chef Catherine Olsen</h3>
              <p className="mt-2 text-neutral-800">
                Born and raised in Minneapolis. A skilled baker with a lifelong career in food, including Wuollet Bakery, Lucia’s, and Churchill Street. She brings warmth, craft, and deep local roots to our kitchen.
              </p>
            </article>
          </div>
        </section>

        {/* Modular photo grids from Cloudinary tags */}
        <section aria-label="Photo galleries" className="space-y-10">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <PhotoGrid tags={["team","kitchen"]} title="In the kitchen" perPage={8} />
            </div>
            <div className="card">
              <PhotoGrid tags={["event","dinner"]} title="At events" perPage={8} />
            </div>
          </div>
        </section>

        <div className="h-px bg-neutral-200" />

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

        <div className="h-px bg-neutral-200" />

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
            <a href="https://www.localeffortfood.com/services#event-request" aria-label="Submit Event Request">
              <ModernButton size="md" variant="primary">Submit Event Request</ModernButton>
            </a>
          </div>
        </section>
      </article>
    </>
  );
};

export default AboutUsPage;
