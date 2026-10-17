const express = require('express');
const { prisma } = require('../utils/prisma');
const { getSupabase } = require('../supabaseClient');
const { isAdminEmail } = require('../utils/adminVerifier');
const { getPizzaDrop } = require('../../../api-handlers/store/_pizzaDrop');
const linkRegistry = require('../../../shared/home-bulletin-links.json');

const router = express.Router();

// Shared with the page and the admin editor so all three agree on what a link
// and a live value are. ESM, so it loads on demand.
let bulletinRules;
const loadRules = () => (bulletinRules ||= import('../../../shared/home-bulletin.mjs'));

const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);

// The Pizza on Smith ordering window is owned by the CMS; the bulletin reads it
// here instead of carrying dates in its text.
async function liveFacts() {
  try {
    const drop = await getPizzaDrop();
    return { pizza: { opensAt: iso(drop?.opensAt), closesAt: iso(drop?.closesAt), fulfillment: drop?.fulfillmentLabel || '' } };
  } catch (error) {
    console.error('home-bulletin live facts failed:', error);
    return {};
  }
}

router.get('/', async (_req, res) => {
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const row = await prisma.homeBulletin.findUnique({ where: { id: 'home' } });
    return res.json({ markdown: row?.markdown || '', facts: await liveFacts() });
  } catch (error) {
    console.error('GET /api/home-bulletin failed:', error);
    return res.status(503).json({ error: 'Bulletin unavailable' });
  }
});

router.put('/', async (req, res) => {
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Authentication unavailable' });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user || !isAdminEmail(data.user.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const markdown = typeof req.body?.markdown === 'string' ? req.body.markdown : null;
    if (markdown === null) return res.status(400).json({ error: 'Markdown must be text' });
    const { validateBulletin } = await loadRules();
    const problems = validateBulletin(markdown, linkRegistry);
    if (problems.length) {
      return res.status(400).json({
        error: problems.map((problem) => `Line ${problem.line}: ${problem.message}`).join(' '),
        problems,
      });
    }
    const row = await prisma.homeBulletin.upsert({
      where: { id: 'home' },
      create: { id: 'home', markdown },
      update: { markdown },
    });
    return res.json({ markdown: row.markdown, facts: await liveFacts() });
  } catch (error) {
    console.error('PUT /api/home-bulletin failed:', error);
    return res.status(500).json({ error: 'Could not save bulletin' });
  }
});

module.exports = { createHomeBulletinRouter: () => router };
