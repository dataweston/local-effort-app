/*
  Sync Sanity content into Supabase KB tables (Phase 1+)
  - FAQs (pricingFaq or local pricingFaq.json fallback)
  - Pages (page documents)
  - Estimator help (local estimatorHelp.json)
*/
/* eslint-disable no-console */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const {
  getClients,
  fetchFaqsFromSanity,
  fetchPagesFromSanity,
  ingestFaqs,
  ingestPages,
} = require('../api/utils/kbIngest');

async function main() {
  const { sanity, supabase } = getClients();
  const all = { faqs: [], pages: [] };

  console.log('Fetching from Sanity…');
  try {
    all.faqs = await fetchFaqsFromSanity(sanity);
  } catch (e) {
    console.warn('Sanity FAQ fetch failed:', e && e.message);
  }
  try {
    all.pages = await fetchPagesFromSanity(sanity);
  } catch (e) {
    console.warn('Sanity page fetch failed:', e && e.message);
  }

  if (!all.faqs || all.faqs.length === 0) {
    console.log('No Sanity FAQs found; falling back to local pricingFaq.json');
    try {
      const file = path.resolve(__dirname, '../../src/data/pricingFaq.json');
      const raw = fs.readFileSync(file, 'utf8');
      const json = JSON.parse(raw);
      all.faqs = json.map((x, i) => ({ _id: `local-faq-${i}`, question: x.name, answer: x.answer }));
    } catch (e) {
      console.warn('Local pricingFaq.json fallback failed:', e && e.message);
    }
  }
  // Optional estimator help
  try {
    const file = path.resolve(__dirname, '../../src/data/estimatorHelp.json');
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const arr = JSON.parse(raw);
      const mapped = arr.map((x, i) => ({ _id: `local-estimator-${i}`, question: x.title, answer: x.body }));
      all.faqs = [...(all.faqs || []), ...mapped];
    }
  } catch (e) {
    console.warn('estimatorHelp.json read failed:', e && e.message);
  }

  console.log(`Ingesting ${all.faqs?.length || 0} FAQ(s) and ${all.pages?.length || 0} page(s)…`);
  if (all.faqs && all.faqs.length) await ingestFaqs({ supabase, faqs: all.faqs });
  if (all.pages && all.pages.length) await ingestPages({ supabase, pages: all.pages });
  console.log('Sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
