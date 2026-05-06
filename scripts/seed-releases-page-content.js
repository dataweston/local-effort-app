#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const sanity = require('@sanity/client');

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), '.env.vercel.production'), override: false });

const projectId =
  process.env.VITE_APP_SANITY_PROJECT_ID ||
  process.env.VITE_SANITY_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID ||
  'd6l9d0ea';
const dataset =
  process.env.VITE_APP_SANITY_DATASET ||
  process.env.VITE_SANITY_DATASET ||
  process.env.SANITY_DATASET ||
  'localeffort';
const token = process.env.SANITY_API_TOKEN || process.env.SANITY_WRITE_TOKEN || process.env.sanity_write_token;

if (!token) {
  process.stderr.write('[release-seed] Missing SANITY_API_TOKEN or SANITY_WRITE_TOKEN.\n');
  process.exit(1);
}

const client = sanity.createClient({
  projectId,
  dataset,
  token,
  useCdn: false,
  apiVersion: '2023-05-03',
});

function slug(current) {
  return { _type: 'slug', current };
}

function block(text, index, style = 'normal') {
  return {
    _key: `b${index}`,
    _type: 'block',
    style,
    markDefs: [],
    children: [
      {
        _key: `s${index}`,
        _type: 'span',
        marks: [],
        text,
      },
    ],
  };
}

function blocks(items) {
  return items.map((item, index) => (
    typeof item === 'string'
      ? block(item, index)
      : block(item.text, index, item.style || 'normal')
  ));
}

const sharedPressFacts = [
  { _key: 'fact-founded', label: 'Founded', value: '2022' },
  { _key: 'fact-headquarters', label: 'Headquarters', value: 'Minneapolis, Minnesota' },
  { _key: 'fact-service-areas', label: 'Service Areas', value: 'Minneapolis, St. Paul, Roseville, the Twin Cities, and Western Wisconsin' },
  { _key: 'fact-services', label: 'Core Services', value: 'Personal chef experiences, weekly meal prep, intimate event catering, and 100% local pizzas' },
];

const sharedLeadership = [
  {
    _key: 'weston-smith',
    name: 'Weston Smith',
    title: 'Chef & Co-Founder',
    bio: 'Trained in fine dining in New York after beginnings in Portland coffee. Leads culinary direction with a focus on Minnesota-grown ingredients.',
  },
  {
    _key: 'catherine-olsen',
    name: 'Catherine Olsen',
    title: 'Chef & Co-Founder',
    bio: 'Minneapolis native and veteran baker who brings warmth, hospitality, and deep local sourcing relationships to the kitchen.',
  },
];

const docs = [
  {
    _id: 'release-local-pizza-1000-2025-09-30',
    _type: 'release',
    title: 'Roseville-Based Local Effort Seeks Support to Craft 1,000 Fully Local Pizzas',
    slug: slug('local-pizza-1000-2025-09-30'),
    summary: 'Roseville-based Local Effort Cooperative invites the community to back its most ambitious pizza initiative yet - building a thousand pies sourced entirely from Midwestern growers, millers, and producers.',
    publishedAt: '2025-09-30T09:00:00-05:00',
    metaDescription: 'Press release and media resources for Local Effort Cooperative and its 1,000 fully local pizza crowdfunding initiative.',
    canonicalUrl: 'https://www.localeffortfood.com/releases',
    isArchived: false,
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
      'Goal: Handcraft and deliver 1,000 wood-fired pizzas made with 100% local Midwest ingredients.',
      'Purpose: Fund expanded capacity and improve quality control, in the service of opening a pizza shop next year.',
      'Backer Rewards: Pizzas, pies, events, and premium special offers like sockeye bottarga.',
      'Timeline: 30-day crowdfunding campaign with weekly progress updates and community tastings.',
    ],
    pressFacts: sharedPressFacts,
    leadership: sharedLeadership,
    pressAssets: [
      { _key: 'website', label: 'Website', value: 'https://localeffortfood.com', href: 'https://localeffortfood.com' },
      { _key: 'crowdfunding', label: 'Crowdfunding Hub', value: 'Join the pizza campaign', href: '/crowdfunding' },
      { _key: 'gallery', label: 'Media Gallery', value: 'High-resolution kitchen & event photography', href: '/gallery' },
      { _key: 'services', label: 'Service Overview', value: 'Menus, pricing, and service areas', href: '/services' },
    ],
    storyAngles: [
      'Farm-to-pizza supply chains featuring grain cooperatives, creameries, and seasonal produce.',
      'Growing a chef-led small business through community-backed crowdfunding.',
      "How Local Effort's weekly meal prep program informs fast-casual pizza innovation.",
    ],
    body: blocks([
      "The crowdfunding campaign energizes Local Effort's obsession with 100% regional sourcing. Every crust, sauce, and topping will trace back to Minnesota and Midwest farms, mills, creameries, and co-ops that the chef team has partnered with since 2022.",
      'Backers will help finance upgraded capacity and purchasing power, unlocking more neighborhood pop-ups, farmers market collaborations, and last-mile delivery runs throughout Minneapolis, St. Paul, and Western Wisconsin.',
      { style: 'blockquote', text: '"This is truly Local Pizza," said Weston Smith, chef and co-founder of Local Effort. "The grain, the cheese, the tomatoes all tell a story about producing food in the Midwest. If we sell a thousand pies, we will focus on opening a shop."' },
      'Supporters can choose from tiered rewards including apple pies, special invite-only parties and events, premium home events, and exclusive seasonal toppings co-developed with local growers. Weekly progress bulletins and tasting events will keep the community connected as milestones are reached on the path to 1,000 pizzas.',
      'Local Effort has grown from intimate in-home dinners to weekly meal prep and private events by doubling down on local-first commitments. The pizza program translates that ethos into a universally beloved format.',
      'The crowdfunding page is live now at localeffortfood.com/crowdfunding. Early backers will unlock surprise collaborations with partner farms and organizations across the Twin Cities.',
    ]),
  },
  {
    _id: 'release-local-pizza-1000-2024-05-30',
    _type: 'release',
    title: 'Local Effort Launches Crowdfunding Campaign to Craft 1,000 Local Pizzas',
    slug: slug('local-pizza-1000-2024-05-30'),
    summary: 'Minneapolis-based Local Effort Cooperative invites the community to back its most ambitious pizza initiative yet - building a thousand pies sourced entirely from Midwestern growers, millers, and makers.',
    publishedAt: '2024-05-30T09:00:00-05:00',
    isArchived: true,
    body: blocks([
      "The crowdfunding campaign energizes Local Effort's obsession with 100% regional sourcing. Every crust, sauce, and topping will trace back to Minnesota and Midwest farms, mills, creameries, and co-ops that the chef team has partnered with since 2022.",
      'Backers will help finance upgraded cold storage and a mobile pizza rig, unlocking more neighborhood pop-ups, farmers market collaborations, and last-mile delivery runs throughout Minneapolis, St. Paul, and Western Wisconsin.',
      { style: 'blockquote', text: '"Pizzas can tell the whole story of a foodshed," said Weston Smith, chef and co-founder of Local Effort. "When we layer house-fermented dough with seasonal produce, heritage grains, and regional cheeses, we showcase the farms that feed us. This campaign invites people to invest in that community table."' },
      'Supporters can choose from tiered rewards including limited pizza drops, family meal prep bundles, and exclusive seasonal toppings co-developed with local growers. Weekly progress bulletins and tasting events will keep the community connected as milestones are reached on the path to 1,000 pizzas.',
      'Local Effort has grown from intimate in-home dinners to weekly meal prep and community events by doubling down on relationships with Minnesota farmers, grain cooperatives, and dairy makers. The pizza program translates that ethos into a handheld, shareable format that can reach more tables without compromising sourcing.',
    ]),
  },
];

async function main() {
  const transaction = client.transaction();
  docs.forEach((doc) => transaction.createOrReplace(doc));
  await transaction.commit();
  process.stdout.write(`[release-seed] Upserted ${docs.length} release documents into ${projectId}/${dataset}.\n`);
}

main().catch((error) => {
  process.stderr.write(`[release-seed] Failed: ${error?.message || error}\n`);
  process.exit(1);
});
