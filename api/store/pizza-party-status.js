// GET /api/store/pizza-party-status
// Returns aggregated pizza party booking status for client availability UI (unauthenticated).

let db = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  db = admin.firestore();
} catch (_) {
  // Firestore optional at build time
}

const normalizeDateToken = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim();
};

const ALLOWED_ORIGINS = ['https://localeffortfood.com', 'https://www.localeffortfood.com'];

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!db) {
    return res.status(200).json({ ok: true, soldOutDates: [] });
  }
  try {
    const snap = await db.collection('pizzaPartyBookings').orderBy('createdAt', 'desc').limit(200).get();
    const counts = new Map();
    snap.forEach((doc) => {
      const dateToken = normalizeDateToken(doc.get('date'));
      if (!dateToken) return;
      counts.set(dateToken, (counts.get(dateToken) || 0) + 1);
    });
    const soldOutDates = Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([dateToken]) => dateToken);
    return res.status(200).json({ ok: true, soldOutDates });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to load availability' });
  }
};
