// Single server-side source for the Pizza on Smith ordering window.
// The editor-owned values live on the Sanity `pizzaOnSmithPage` document; the
// generated page snapshot (built from that same document) fills any field that
// is unset and covers a Sanity outage, so checkout never disagrees with the page.
const sanity = require('@sanity/client');
const { getGeneratedStorePage } = require('./_saleCatalog');

const CACHE_MS = 30 * 1000;
const DROP_FIELDS = ['dropOpensAt', 'dropClosesAt', 'fulfillmentLabel'];
const DROP_PROJECTION = `*[_type == "pizzaOnSmithPage"][0]{${DROP_FIELDS.join(', ')}}`;

let client;
let cache = null;

function getClient() {
  if (client !== undefined) return client;
  const projectId =
    process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
  const dataset =
    process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;
  client = projectId && dataset
    ? sanity.createClient({ projectId, dataset, useCdn: false, perspective: 'published', apiVersion: '2025-02-19' })
    : null;
  return client;
}

function resolvePizzaDrop(sanityPage) {
  const fallback = getGeneratedStorePage('pizza-on-smith') || {};
  const pick = (field) => sanityPage?.[field] || fallback[field] || null;
  const opensAt = Date.parse(pick('dropOpensAt'));
  const closesAt = Date.parse(pick('dropClosesAt'));
  return {
    opensAt: Number.isFinite(opensAt) ? opensAt : null,
    closesAt: Number.isFinite(closesAt) ? closesAt : null,
    fulfillmentLabel: pick('fulfillmentLabel') || '',
  };
}

async function getPizzaDrop() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.drop;
  let page = null;
  const sanityClient = getClient();
  if (sanityClient) {
    try {
      page = await sanityClient.fetch(DROP_PROJECTION);
    } catch (error) {
      console.error('[pizza-drop] Sanity fetch failed; using generated snapshot.', error?.message || error);
    }
  }
  const drop = resolvePizzaDrop(page);
  if (page) cache = { at: Date.now(), drop };
  return drop;
}

// 'open' | 'upcoming' | 'closed'. A drop with no valid window is closed.
function pizzaDropStatus(drop, now = Date.now()) {
  if (!drop?.opensAt || !drop?.closesAt) return 'closed';
  if (now < drop.opensAt) return 'upcoming';
  if (now >= drop.closesAt) return 'closed';
  return 'open';
}

module.exports = { getPizzaDrop, resolvePizzaDrop, pizzaDropStatus };
