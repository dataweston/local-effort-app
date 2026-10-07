const express = require('express');
const { prisma } = require('../utils/prisma');
const { getSupabase } = require('../supabaseClient');
const { isAdminEmail } = require('../utils/adminVerifier');

const router = express.Router();

router.get('/', async (_req, res) => {
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const row = await prisma.homeBulletin.findUnique({ where: { id: 'home' } });
    return res.json({ markdown: row?.markdown || '' });
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
    if (markdown === null || markdown.length > 12000) {
      return res.status(400).json({ error: 'Markdown must be text under 12,000 characters' });
    }
    const row = await prisma.homeBulletin.upsert({
      where: { id: 'home' },
      create: { id: 'home', markdown },
      update: { markdown },
    });
    return res.json({ markdown: row.markdown });
  } catch (error) {
    console.error('PUT /api/home-bulletin failed:', error);
    return res.status(500).json({ error: 'Could not save bulletin' });
  }
});

module.exports = { createHomeBulletinRouter: () => router };
