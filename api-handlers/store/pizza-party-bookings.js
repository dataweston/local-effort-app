// GET /api/store/pizza-party-bookings?limit=50
// Returns recent pizza party bookings (requires x-admin-key matching process.env.ADMIN_API_KEY)

const crypto = require('crypto');

function isValidAdminKey(value) {
  const supplied = String(value || '');
  const expected = process.env.ADMIN_API_KEY || '';
  if (!supplied || !expected || supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

let db = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  db = admin.firestore();
} catch (_) { /* optional */ }

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isValidAdminKey(req.headers['x-admin-key'])) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!db) return res.status(500).json({ error: 'DB not available' });
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const snap = await db.collection('pizzaPartyBookings').orderBy('createdAt', 'desc').limit(limit).get();
    const rows = [];
    snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
    return res.status(200).json({ ok: true, bookings: rows });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to list bookings' });
  }
};
