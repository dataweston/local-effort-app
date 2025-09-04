/* Support KB ingestion endpoints: manual sync and Sanity webhook */
/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const {
  getClients,
  fetchFaqsFromSanity,
  fetchPagesFromSanity,
  ingestFaqs,
  ingestPages,
} = require('./utils/kbIngest');

async function runIngest() {
  const { sanity, supabase } = getClients();
  const all = { faqs: [], pages: [] };
  try {
    all.faqs = await fetchFaqsFromSanity(sanity);
  } catch (e) {
    console.warn('Fetch FAQs from Sanity failed:', e && e.message);
  }
  try {
    all.pages = await fetchPagesFromSanity(sanity);
  } catch (e) {
    console.warn('Fetch pages from Sanity failed:', e && e.message);
  }

  // Fallback to local JSON for FAQs
  if (!all.faqs || all.faqs.length === 0) {
    try {
      const file = path.resolve(__dirname, '../../src/data/pricingFaq.json');
      const raw = fs.readFileSync(file, 'utf8');
      const arr = JSON.parse(raw);
      all.faqs = arr.map((x, i) => ({ _id: `local-faq-${i}`, question: x.name, answer: x.answer }));
    } catch (e) {
      console.warn('Local pricingFaq.json fallback failed:', e && e.message);
    }
  }
  // Also ingest estimator help if present
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

  if (all.faqs && all.faqs.length) {
    await ingestFaqs({ supabase, faqs: all.faqs });
  }
  if (all.pages && all.pages.length) {
    await ingestPages({ supabase, pages: all.pages });
  }
  return { faqs: all.faqs?.length || 0, pages: all.pages?.length || 0 };
}

function authorize(req) {
  const token = process.env.SYNC_TOKEN || process.env.SANITY_WEBHOOK_SECRET;
  if (!token) return false;
  const header = req.get('X-Admin-Token');
  const qs = req.query && (req.query.token || req.query.secret);
  const bodySecret = req.body && (req.body.token || req.body.secret);
  return header === token || qs === token || bodySecret === token;
}

function registerSupportIngest(app) {
  app.post('/api/support/sync', async (req, res) => {
    try {
      if (!authorize(req)) return res.status(401).json({ error: 'unauthorized' });
      const result = await runIngest();
      return res.json({ ok: true, ...result });
    } catch (err) {
      console.error('support sync error', err);
      return res.status(500).json({ error: 'sync-failed' });
    }
  });

  // Basic webhook (Sanity): accepts POST with ?secret=... to authorize
  app.post('/api/support/webhook', async (req, res) => {
    try {
      if (!authorize(req)) return res.status(401).json({ error: 'unauthorized' });
      const result = await runIngest();
      return res.json({ ok: true, ...result });
    } catch (err) {
      console.error('support webhook error', err);
      return res.status(500).json({ error: 'webhook-failed' });
    }
  });
}

module.exports = { registerSupportIngest };
