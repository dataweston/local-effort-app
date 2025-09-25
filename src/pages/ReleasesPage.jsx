import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const typewriterFonts = "'IBM Plex Mono', 'Courier Prime', 'Courier New', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'";

const releaseDate = 'May 30, 2024';

const pressFacts = [
  { label: 'Founded', value: '2022' },
  { label: 'Headquarters', value: 'Minneapolis, Minnesota' },
  {
    label: 'Service Areas',
    value: 'Minneapolis, St. Paul, Roseville, the Twin Cities, and Western Wisconsin',
  },
  {
    label: 'Core Services',
    value: 'Personal chef experiences, weekly meal prep, intimate event catering, and 100% local pizzas',
  },
];

const leadership = [
  {
    name: 'Weston Smith',
    title: 'Chef & Co-Founder',
    bio:
      'Trained in fine dining in New York after beginnings in Portland coffee. Leads culinary direction with a focus on Minnesota-grown ingredients.',
  },
  {
    name: 'Catherine Olsen',
    title: 'Chef & Co-Founder',
    bio:
      'Minneapolis native and veteran baker who brings warmth, hospitality, and deep local sourcing relationships to the kitchen.',
  },
];

const campaignHighlights = [
  'Goal: Handcraft and deliver 1,000 wood-fired pizzas made with 100% local Midwest ingredients.',
  'Purpose: Fund expanded cold storage and mobile pizza equipment to grow community pop-ups.',
  'Backer Rewards: Tiered pizza shares, behind-the-scenes kitchen tours, and limited-edition seasonal toppings.',
  'Timeline: 30-day crowdfunding campaign with weekly progress updates and community tastings.',
];

const pressAssets = [
  {
    label: 'Website',
    value: 'https://localeffortfood.com',
    href: 'https://localeffortfood.com',
  },
  {
    label: 'Crowdfunding Hub',
    value: 'Join the pizza campaign',
    href: '/crowdfunding',
  },
  {
    label: 'Media Gallery',
    value: 'High-resolution kitchen & event photography',
    href: '/gallery',
  },
  {
    label: 'Service Overview',
    value: 'Menus, pricing, and service areas',
    href: '/services',
  },
];

const ReleasesPage = () => {
  return (
    <>
      <Helmet>
        <title>Releases | Local Effort</title>
        <meta
          name="description"
          content="Press releases and media resources from Local Effort Food Co., the Minneapolis-based personal chef and catering team."
        />
        <link rel="canonical" href="https://localeffortfood.com/releases" />
      </Helmet>

      <div className="bg-neutral-50 py-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
          <section
            className="bg-white border border-neutral-200 shadow-xl shadow-neutral-900/5 rounded-2xl overflow-hidden"
            style={{ fontFamily: typewriterFonts }}
          >
            <div className="bg-neutral-900 text-neutral-100 px-6 py-3 text-xs tracking-[0.4em] uppercase">Press Release</div>
            <div className="px-6 py-8 md:px-10 md:py-12 space-y-8">
              <header className="space-y-4">
                <div className="flex flex-col gap-1 text-neutral-600 text-sm uppercase tracking-[0.3em]">
                  <span>For Immediate Release</span>
                  <span>{releaseDate}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-[2fr,1fr] md:items-start">
                  <div className="space-y-3">
                    <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 leading-tight">
                      Local Effort Launches Crowdfunding Campaign to Craft 1,000 Local Pizzas
                    </h1>
                    <p className="text-base text-neutral-700 leading-relaxed">
                      Minneapolis-based Local Effort Food Co. invites the community to back its most ambitious pizza initiative yet—building a thousand pies sourced entirely from Midwestern growers, millers, and makers.
                    </p>
                  </div>
                  <aside className="md:justify-self-end md:text-right text-sm text-neutral-700">
                    <p className="font-semibold text-neutral-900">Media Contact</p>
                    <p>Local Effort Food Co.</p>
                    <p><a href="tel:+1612555XXXX" className="underline underline-offset-4 hover:opacity-80">+1&nbsp;612&nbsp;555&nbsp;XXXX</a></p>
                    <p>
                      <a href="https://localeffortfood.com" className="underline underline-offset-4 hover:opacity-80">
                        localeffortfood.com
                      </a>
                    </p>
                  </aside>
                </div>
              </header>

              <div className="space-y-5 text-[1.02rem] leading-relaxed text-neutral-800">
                <p>
                  The crowdfunding campaign energizes Local Effort&apos;s obsession with 100% regional sourcing. Every crust, sauce, and topping will trace back to Minnesota and Midwest farms, mills, creameries, and co-ops that the chef team has partnered with since 2022.
                </p>
                <p>
                  Backers will help finance upgraded cold storage and a mobile pizza rig, unlocking more neighborhood pop-ups, farmers market collaborations, and last-mile delivery runs throughout Minneapolis, St. Paul, and Western Wisconsin.
                </p>
                <p>
                  “Pizzas can tell the whole story of a foodshed,” said Weston Smith, chef and co-founder of Local Effort. “When we layer house-fermented dough with seasonal produce, heritage grains, and regional cheeses, we showcase the farms that feed us. This campaign invites people to invest in that community table.”
                </p>
                <p>
                  Supporters can choose from tiered rewards including limited pizza drops, family meal prep bundles, and exclusive seasonal toppings co-developed with local growers. Weekly progress bulletins and tasting events will keep the community connected as milestones are reached on the path to 1,000 pizzas.
                </p>
              </div>

              <section aria-labelledby="campaign-highlights" className="space-y-3">
                <h2 id="campaign-highlights" className="text-sm uppercase tracking-[0.3em] text-neutral-600">
                  Campaign Snapshot
                </h2>
                <ul className="space-y-3 text-neutral-800">
                  {campaignHighlights.map((item) => (
                    <li key={item} className="pl-5 relative">
                      <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-neutral-900" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <div className="space-y-5 text-[1.02rem] leading-relaxed text-neutral-800">
                <p>
                  Local Effort has grown from intimate in-home dinners to weekly meal prep and private events by doubling down on relationships with Minnesota farmers, grain cooperatives, and dairy makers. The pizza program translates that ethos into a handheld, shareable format that can reach more tables without compromising sourcing.
                </p>
                <p>
                  The crowdfunding page is live now at{' '}
                  <Link to="/crowdfunding" className="underline underline-offset-4 font-semibold">
                    localeffortfood.com/crowdfunding
                  </Link>
                  . Early backers will unlock surprise collaborations with partner farms and community organizations across the Twin Cities.
                </p>
              </div>

              <footer className="pt-6 border-t border-dashed border-neutral-300">
                <p className="uppercase tracking-[0.3em] text-xs text-neutral-600">About Local Effort</p>
                <p className="mt-3 text-[1.02rem] leading-relaxed text-neutral-800">
                  Local Effort Food Co. is a Minneapolis-based personal chef and catering team specializing in locally sourced cuisine. Since 2022, the team has designed in-home dinners, weekly meal prep, and community events that keep Midwestern ingredients at the center of every menu.
                </p>
              </footer>
            </div>
          </section>

          <section className="mt-16 space-y-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Press Kit</h2>
              <p className="text-neutral-600 max-w-3xl">
                Download-ready facts, leadership bios, and campaign details to support coverage of Local Effort&apos;s 1,000 pizza crowdfunding initiative.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-neutral-900">Fast Facts</h3>
                <dl className="mt-4 space-y-3 text-neutral-700">
                  {pressFacts.map(({ label, value }) => (
                    <div key={label} className="flex flex-col">
                      <dt className="text-xs uppercase tracking-[0.25em] text-neutral-500">{label}</dt>
                      <dd className="text-base">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-neutral-900">Leadership</h3>
                <ul className="mt-4 space-y-4 text-neutral-700">
                  {leadership.map(({ name, title, bio }) => (
                    <li key={name}>
                      <p className="text-base font-semibold text-neutral-900">{name}</p>
                      <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">{title}</p>
                      <p className="mt-2 text-sm leading-relaxed">{bio}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-semibold text-neutral-900">Campaign Assets</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {pressAssets.map(({ label, value, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="group flex flex-col justify-between rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-400 hover:shadow"
                    >
                      <span className="text-xs uppercase tracking-[0.25em] text-neutral-500">{label}</span>
                      <span className="mt-2 text-base text-neutral-900 group-hover:underline group-hover:underline-offset-4">
                        {value}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-neutral-900">Media Contact</h3>
                <p className="mt-3 text-sm text-neutral-600">
                  Local Effort Food Co.<br />
                  Minneapolis, MN
                </p>
                <p className="mt-4 text-sm text-neutral-700">
                  Phone:{' '}
                  <a href="tel:+1612555XXXX" className="underline underline-offset-4 hover:opacity-80">
                    +1&nbsp;612&nbsp;555&nbsp;XXXX
                  </a>
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  Instagram:{' '}
                  <a href="https://www.instagram.com/localeffortfood" className="underline underline-offset-4 hover:opacity-80">
                    @localeffortfood
                  </a>
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  TikTok:{' '}
                  <a href="https://www.tiktok.com/@localeffort" className="underline underline-offset-4 hover:opacity-80">
                    @localeffort
                  </a>
                </p>
                <p className="mt-6">
                  <Link
                    to="/crowdfunding"
                    className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold tracking-wide text-white transition hover:bg-neutral-800"
                  >
                    View crowdfunding campaign
                  </Link>
                </p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-neutral-900">Story Angles</h3>
                <ul className="mt-4 space-y-3 text-neutral-700">
                  <li className="pl-4 relative">
                    <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-neutral-900" aria-hidden="true" />
                    Farm-to-pizza supply chains featuring grain cooperatives, creameries, and seasonal produce.
                  </li>
                  <li className="pl-4 relative">
                    <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-neutral-900" aria-hidden="true" />
                    Growing a chef-led small business through community-backed crowdfunding.
                  </li>
                  <li className="pl-4 relative">
                    <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-neutral-900" aria-hidden="true" />
                    How Local Effort&apos;s weekly meal prep program informs fast-casual pizza innovation.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default ReleasesPage;
