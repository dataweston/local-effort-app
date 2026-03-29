const fs = require('fs');
const path = require('path');
const {
  getClients,
  fetchFaqsFromSanity,
  fetchPagesFromSanity,
  ingestFaqs,
  ingestPages,
  loadLocalDocs,
  ingestLocalDocs,
} = require('../utils/kbIngest');

function createSupportIngestService({
  getClientsFn = getClients,
  fetchFaqs = fetchFaqsFromSanity,
  fetchPages = fetchPagesFromSanity,
  ingestFaqsFn = ingestFaqs,
  ingestPagesFn = ingestPages,
  loadLocalDocsFn = loadLocalDocs,
  ingestLocalDocsFn = ingestLocalDocs,
  fsImpl = fs,
  logger = console,
  pricingFaqPath = path.resolve(__dirname, '../../../src/data/pricingFaq.json'),
  estimatorHelpPath = path.resolve(__dirname, '../../../src/data/estimatorHelp.json'),
  localDocsPath = path.resolve(__dirname, '../../../docs/support'),
  env = process.env,
} = {}) {
  async function runIngest() {
    const { sanity, supabase } = getClientsFn();
    const all = { faqs: [], pages: [], localDocs: 0 };

    try {
      all.faqs = await fetchFaqs(sanity);
    } catch (error) {
      logger?.warn?.({ err: error }, 'fetch faqs from sanity failed');
    }

    try {
      all.pages = await fetchPages(sanity);
    } catch (error) {
      logger?.warn?.({ err: error }, 'fetch pages from sanity failed');
    }

    if (!all.faqs || all.faqs.length === 0) {
      try {
        const raw = fsImpl.readFileSync(pricingFaqPath, 'utf8');
        const arr = JSON.parse(raw);
        all.faqs = arr.map((entry, index) => ({
          _id: `local-faq-${index}`,
          question: entry.name,
          answer: entry.answer,
        }));
      } catch (error) {
        logger?.warn?.({ err: error }, 'local pricing faq fallback failed');
      }
    }

    try {
      if (fsImpl.existsSync(estimatorHelpPath)) {
        const raw = fsImpl.readFileSync(estimatorHelpPath, 'utf8');
        const arr = JSON.parse(raw);
        const mapped = arr.map((entry, index) => ({
          _id: `local-estimator-${index}`,
          question: entry.title,
          answer: entry.body,
        }));
        all.faqs = [...(all.faqs || []), ...mapped];
      }
    } catch (error) {
      logger?.warn?.({ err: error }, 'local estimator help fallback failed');
    }

    if (all.faqs.length > 0) {
      await ingestFaqsFn({ supabase, faqs: all.faqs });
    }
    if (all.pages.length > 0) {
      await ingestPagesFn({ supabase, pages: all.pages });
    }

    try {
      const localDocs = loadLocalDocsFn(localDocsPath);
      if (Array.isArray(localDocs) && localDocs.length > 0) {
        await ingestLocalDocsFn({ supabase, docs: localDocs });
        all.localDocs = localDocs.length;
      }
    } catch (error) {
      logger?.warn?.({ err: error }, 'local docs ingest failed');
    }

    return {
      faqs: all.faqs.length,
      pages: all.pages.length,
      localDocs: all.localDocs,
    };
  }

  function authorize(req) {
    const token = env.SYNC_TOKEN || env.SANITY_WEBHOOK_SECRET;
    if (!token) return false;
    const header = req.get('X-Admin-Token');
    const qs = req.query && (req.query.token || req.query.secret);
    const bodySecret = req.body && (req.body.token || req.body.secret);
    return header === token || qs === token || bodySecret === token;
  }

  return {
    authorize,
    runIngest,
  };
}

module.exports = { createSupportIngestService };
