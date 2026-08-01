#!/usr/bin/env node
/**
 * Publish the Chez Garage press release into Sanity.
 *
 * /releases reads Sanity at runtime and falls back to
 * src/store/data/generatedReleasesPageData.json, which is regenerated from
 * Sanity at build time — so Sanity is the only place a release can durably
 * live. Hand-editing the generated JSON would be overwritten by the next build.
 *
 *   node scripts/publish-chez-garage-release.js --dry-run   print the document
 *   node scripts/publish-chez-garage-release.js             write it
 *
 * createOrReplace keyed on a fixed _id, so re-running updates rather than
 * duplicating.
 */

const path = require('path');
const dotenv = require('dotenv');
const sanity = require('@sanity/client');

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local'), override: false });

const DOC_ID = 'release-chez-garage-2026-07-31';

const paragraphs = [
  'Chez Garage is Local Effort’s answer to a question the co-op keeps getting: can you get chef cooking without the occasion that usually comes with it. The format is a garage, a pizza oven, a smoker, and a menu that changes with what Minnesota farms have that week. Guests order online, pull up, and leave with dinner and with food for the rest of the week.',
  'The cooperative calls the format hyper-casual dining — the food is the only formal thing about it. The same Minnesota-grown ingredients and technique the team puts into private dinners and weekly meal prep are handed over in a driveway, on a paper plate, at pop-up prices.',
  'The Edina run opens Thursday, July 30 and closes Sunday, August 2, 2026. The menu includes twelve-inch pub pizzas made to order — a classic cheese with mozzarella and brick at $13, a green leeks pizza on tomatillo sauce at $15 — alongside cherry-rubbed pork belly at $32 and pantry goods such as ramp oil at $24. Frozen pizzas built on puffy sourdough crusts, topped and vacuum sealed to bake at home, run $24 for a two-pack to $74 for a six-pack. Delivery orders have a $75 minimum; some items are pickup only.',
  'Chez Garage also travels. The cooperative will bring a chef, an oven, and the rest of the equipment to a host’s own driveway for up to 40 guests, at an estimated $25 to $45 per person with a $200 deposit holding the date.',
  'Local Effort Cooperative has cooked from Minnesota and Midwest farms, mills, creameries, and co-ops since 2022. It is worker-owned: every staff member is offered equity in the business.',
];

const doc = {
  _id: DOC_ID,
  _type: 'release',
  title: 'Local Effort Cooperative Opens Chez Garage, a Hyper-Casual Dining Pop-Up in Edina',
  slug: { _type: 'slug', current: 'chez-garage-edina-2026' },
  publishedAt: '2026-07-31T09:00:00.000Z',
  isArchived: false,
  summary:
    'Local Effort Cooperative brings Chez Garage — hyper-casual dining built around pub pizza, smoked and braised meats, and pantry goods — to Edina, Minnesota from Thursday, July 30 through Sunday, August 2, 2026. Orders are placed online for pickup or local delivery, and the format travels to private driveways for up to 40 guests.',
  metaDescription:
    'Press release: Local Effort Cooperative opens Chez Garage, a hyper-casual dining pop-up in Edina, Minnesota, July 30 – August 2, 2026.',
  canonicalUrl: 'https://www.localeffortfood.com/releases',
  mediaContact: {
    name: 'Weston Smith',
    organization: 'Local Effort Cooperative',
    email: 'yum@localeffortfood.com',
    website: 'https://localeffortfood.com',
    location: 'Minneapolis, MN',
    instagram: 'https://www.instagram.com/localeffortfood',
    tiktok: 'https://www.tiktok.com/@localeffort',
  },
  campaignHighlights: [
    'Format: hyper-casual dining — chef cooking, no occasion required, served out of a garage.',
    'Run: Thursday, July 30 through Sunday, August 2, 2026 in Edina, Minnesota.',
    'Menu: twelve-inch pub pizzas made to order, cherry-rubbed pork belly, ramp oil, and frozen pizzas to bake at home.',
    'Ordering: online for pickup or local delivery, $75 delivery minimum.',
    'At home: Local Effort brings the chef and the oven to a host’s driveway for up to 40 guests, $25–$45 per person.',
  ],
  pressFacts: [
    { label: 'Founded', value: '2022' },
    { label: 'Structure', value: 'Worker-owned cooperative; every staff member is offered equity' },
    { label: 'Headquarters', value: 'Minneapolis–St. Paul, Minnesota' },
    { label: 'Pop-Up Dates', value: 'Thursday, July 30 – Sunday, August 2, 2026' },
    { label: 'Location', value: 'Edina, Minnesota' },
    { label: 'Price Range', value: 'Pizzas $13–$15; frozen pizza packs $24–$74; pork belly $32; ramp oil $24' },
    { label: 'Delivery', value: 'Local delivery with a $75 minimum; some items pickup only' },
    { label: 'Private Bookings', value: 'Up to 40 guests, $25–$45 per person, $200 deposit holds the date' },
    { label: 'Sourcing', value: '100% Midwest ingredients from Minnesota farms, mills, creameries, and co-ops' },
  ],
  leadership: [
    {
      name: 'Weston Smith',
      title: 'Chef & Co-Founder',
      bio: 'Trained in fine dining in New York after beginnings in Portland coffee. Leads culinary direction with a focus on Minnesota-grown ingredients.',
    },
    {
      name: 'Catherine Olsen',
      title: 'Chef & Co-Founder',
      bio: 'Minneapolis native and veteran baker who brings warmth, hospitality, and deep local sourcing relationships to the kitchen.',
    },
  ],
  pressAssets: [
    { label: 'Chez Garage', value: 'Menu, dates, and ordering', href: 'https://www.localeffortfood.com/chez-garage' },
    { label: 'Website', value: 'https://localeffortfood.com', href: 'https://localeffortfood.com' },
    { label: 'Private Bookings', value: 'Chez Garage at your own house', href: 'https://www.localeffortfood.com/chez-garage' },
    { label: 'Media Gallery', value: 'High-resolution kitchen & event photography', href: '/gallery' },
  ],
  storyAngles: [
    'Hyper-casual dining: what happens when chef technique is decoupled from the occasion, the table setting, and the price.',
    'A worker-owned kitchen that offers every staff member equity, operating pop-ups instead of a fixed dining room.',
    '100% Midwest sourcing in a format — pub pizza and takeaway — usually built on commodity supply chains.',
    'The suburban pop-up: why a garage in Edina rather than a storefront in Minneapolis.',
    'Take-home economics: frozen pizzas and prepared meals as the part of a pop-up that outlasts the weekend.',
  ],
  body: paragraphs.map((text, i) => ({
    _key: `b${i}`,
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _key: `s${i}`, _type: 'span', marks: [], text }],
  })),
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
    return;
  }

  const projectId =
    process.env.VITE_APP_SANITY_PROJECT_ID ||
    process.env.VITE_SANITY_PROJECT_ID ||
    process.env.SANITY_PROJECT_ID;
  const dataset =
    process.env.VITE_APP_SANITY_DATASET ||
    process.env.VITE_SANITY_DATASET ||
    process.env.SANITY_DATASET;
  const token =
    process.env.SANITY_WRITE_TOKEN ||
    process.env.sanity_write_token ||
    process.env.SANITY_API_TOKEN;

  if (!projectId || !dataset || !token) {
    throw new Error('Missing Sanity project/dataset/write token');
  }

  const client = sanity.createClient({
    projectId,
    dataset,
    token,
    useCdn: false,
    apiVersion: '2023-05-03',
  });

  const result = await client.createOrReplace(doc);
  process.stdout.write(`[chez-garage-release] wrote ${result._id} (rev ${result._rev})\n`);
}

main().catch((error) => {
  process.stderr.write(`[chez-garage-release] ${error?.message || error}\n`);
  process.exit(1);
});
