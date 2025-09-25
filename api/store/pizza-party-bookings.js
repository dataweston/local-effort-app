// GET /api/store/pizza-party-bookings?limit=50
// Returns recent pizza party bookings (requires ADMIN_API_KEY header or ?key= param matching process.env.ADMIN_API_KEY)

let db = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  db = admin.firestore();
} catch (_) { /* optional */ }

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const supplied = req.headers['x-admin-key'] || req.query.key;
  if (!process.env.ADMIN_API_KEY || supplied !== process.env.ADMIN_API_KEY) {
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
