import 'dotenv/config';
import fetch from 'node-fetch';

const {
  SANITY_PROJECT_ID,
  SANITY_DATASET = 'production',
  SANITY_TOKEN
} = process.env;

if (!SANITY_PROJECT_ID) throw new Error('SANITY_PROJECT_ID missing');

const base = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2023-10-01/data/query/${SANITY_DATASET}`;

const query = `
{
  "campaign": *[_type == "crowdfundingCampaign"][0]{
    title,
    "hero": heroImage.asset->url,
    goal, raised, pizzasSold, backers, endDate,
    updateTitle, updateDate, updateLede,
    updateBody[]{ ..., children[]{text} },
    updates[]{ title, date, excerpt, body[]{ ..., children[]{text} } },
    events[]{ title, date, venue, city, url }
  },
  "allEvents": *[_type=="event"]|order(date desc)[0..4]{
    title, date, venue, city, "url": coalesce(url, rsvpUrl)
  },
  "allUpdates": *[_type == "update"]|order(date desc)[0..2]{
    title, date, excerpt,
    body[]{ ..., children[]{text} }
  }
}
`;

function ptToHtml(blocks = []) {
  return blocks.map(b => (b.children||[]).map(c => c.text).join('')).join('\n\n');
}

const url = `${base}?query=${encodeURIComponent(query)}`;
const headers = SANITY_TOKEN ? { Authorization: `Bearer ${SANITY_TOKEN}` } : {};

const r = await fetch(url, { headers });
if (!r.ok) throw new Error(`Sanity query failed: ${r.status} ${r.statusText}`);
const { result } = await r.json();

const c = result.campaign || {};
const raised = Number(c.raised || 0);
const goal   = Number(c.goal || 0);
const pct    = goal > 0 ? Math.min(100, Math.round((raised/goal)*100)) : 0;
const today  = new Date();
const end    = c.endDate ? new Date(c.endDate) : null;
const daysLeft = end ? Math.max(0, Math.ceil((end - today)/86400000)) : '';

const tokens = {
  SITE_URL: 'https://www.localeffortfood.com',
  UPDATES_URL: 'https://www.localeffortfood.com/releases',
  CAMPAIGN_TITLE: c.title || 'Local Effort Crowdfunding',
  HERO_IMAGE_URL: c.hero || 'https://www.localeffortfood.com/og/localeffort-hero.jpg',
  UPDATE_TITLE: c.updateTitle || "We're making 1,000 pizzas for the Twin Cities.",
  UPDATE_DATE: (c.updateDate || '').slice(0,10),
  UPDATE_LEDE_HTML: c.updateLede || 'Pre-order coming soon.',
  UPDATE_BODY_HTML: ptToHtml(c.updateBody || []),
  GOAL: String(goal || ''),
  RAISED: String(raised || ''),
  PIZZAS_SOLD: c.pizzasSold ?? '',
  BACKERS: c.backers ?? '',
  PCT_FUNDED: String(pct),
  DAYS_LEFT: String(daysLeft),
  PRIMARY_CTA_TEXT: 'Buy / Pledge',
  SECONDARY_CTA_TEXT: 'Read Updates',
  PRIMARY_CTA_URL: 'https://www.localeffortfood.com/crowdfunding?utm_source=email&utm_medium=brevo&utm_campaign=cf_update',
  SECONDARY_CTA_URL: 'https://www.localeffortfood.com/releases?utm_source=email&utm_medium=brevo&utm_campaign=cf_update'
};

// events to EVn_* - prefer campaign events, fallback to all events
const events = (c.events && c.events.length) ? c.events : (result.allEvents || []);
events.slice(0,4).forEach((e,i) => {
  const n = i+1;
  tokens[`EV${n}_DATE`]  = (e.date||'').slice(0,10);
  tokens[`EV${n}_TITLE`] = e.title||'';
  tokens[`EV${n}_VENUE`] = e.venue||'';
  tokens[`EV${n}_CITY`]  = e.city||'';
  tokens[`EV${n}_URL`]   = e.url||tokens.UPDATES_URL;
});

// updates to UPn_* - prefer campaign updates, fallback to all updates
const updates = (c.updates && c.updates.length) ? c.updates : (result.allUpdates || []);
updates.slice(0,2).forEach((u,i) => {
  const n = i+1;
  tokens[`UP${n}_TITLE`] = u.title||'';
  tokens[`UP${n}_DATE`]  = (u.date||'').slice(0,10);
  tokens[`UP${n}_EXCERPT`] = u.excerpt||'';
  tokens[`UP${n}_BODY`] = ptToHtml(u.body || []);
});

process.stdout.write(JSON.stringify(tokens, null, 2));