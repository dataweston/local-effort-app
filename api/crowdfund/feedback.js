// GET, POST /api/crowdfund/feedback
// Persists short pizza feedback entries for the crowdfunding page.

let admin = null;
let db = null;
try {
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  db = admin.firestore();
} catch (_) {
  // Firestore optional; when unavailable we degrade gracefully in handlers.
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_NAME_LENGTH = 80;
const DEFAULT_NAME = 'Anonymous pizza fan';

const normalizeText = (value, fallback = '') => {
  if (!value || typeof value !== 'string') return fallback;
  return value.replace(/\s+/g, ' ').trim();
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!db) {
      return res.status(200).json({ ok: true, entries: [] });
    }
    try {
      const snap = await db
        .collection('crowdfundFeedback')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      const entries = [];
      snap.forEach((doc) => {
        const data = doc.data() || {};
        const createdAt = typeof data.createdAt === 'string'
          ? data.createdAt
          : (data.createdAt && typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : null);
        entries.push({
          id: doc.id,
          name: normalizeText(data.name, DEFAULT_NAME),
          message: normalizeText(data.message, ''),
          createdAt: createdAt || null,
        });
      });
      return res.status(200).json({ ok: true, entries });
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'Failed to load feedback' });
    }
  }

  if (req.method === 'POST') {
    if (!db) {
      return res.status(503).json({ error: 'Feedback storage is not configured.' });
    }
    const { name, message } = req.body || {};
    const cleanMessage = normalizeText(message);
    if (!cleanMessage) {
      return res.status(400).json({ error: 'Please share a quick note about the pizza.' });
    }
    const clippedMessage = cleanMessage.slice(0, MAX_MESSAGE_LENGTH);
    const clippedName = normalizeText(name, DEFAULT_NAME).slice(0, MAX_NAME_LENGTH);
    const entry = {
      name: clippedName || DEFAULT_NAME,
      message: clippedMessage,
      createdAt: new Date().toISOString(),
    };
    try {
      const docRef = await db.collection('crowdfundFeedback').add(entry);
      return res.status(200).json({
        ok: true,
        entry: {
          id: docRef.id,
          ...entry,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'Failed to save feedback' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
