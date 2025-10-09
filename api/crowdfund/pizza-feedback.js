const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');

const FEEDBACK_COLLECTION = 'crowdfund_feedback';

const sanitizeName = (value) => {
  const str = String(value || '').replace(/\s+/g, ' ').trim();
  return str.slice(0, 120);
};

const sanitizeMessage = (value) => {
  const str = String(value || '').replace(/\r/g, '').trim();
  return str.slice(0, 600);
};

const sanitizeRating = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const int = Math.round(num);
  if (int < 1 || int > 5) return null;
  return int;
};

const mapFeedbackDoc = (doc) => {
  if (!doc) return null;
  const data = typeof doc.data === 'function' ? doc.data() : doc;
  if (!data) return null;
  const comment = sanitizeMessage(data.comment || data.message);
  if (!comment) return null;
  const rating = sanitizeRating(data.rating);
  return {
    id: doc.id || data.id || `feedback-${Date.now()}`,
    name: sanitizeName(data.name) || 'Anonymous pizza fan',
    comment,
    message: comment,
    rating: rating ?? null,
    createdAt: data.createdAt || null,
  };
};

module.exports = async (req, res) => {
  const { firestore: db } = getFirebaseAdmin();

  if (req.method === 'GET') {
    if (!db) {
      return res.status(503).json({ error: 'Feedback storage unavailable' });
    }

    let limit = parseInt(req.query?.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 8;
    limit = Math.min(limit, 20);

    try {
      const snapshot = await db
        .collection(FEEDBACK_COLLECTION)
        .orderBy('createdAtMs', 'desc')
        .limit(limit)
        .get();

      const entries = Array.isArray(snapshot?.docs)
        ? snapshot.docs.map((doc) => mapFeedbackDoc({ id: doc.id, data: () => doc.data() })).filter(Boolean)
        : [];

      return res.status(200).json({ entries });
    } catch (error) {
      console.warn('[crowdfund.pizza-feedback] list error', error.message);
      return res.status(500).json({ error: 'Failed to load pizza feedback.' });
    }
  }

  if (req.method === 'POST') {
    if (!db) {
      return res.status(503).json({ error: 'Feedback storage unavailable' });
    }

    const name = sanitizeName(req.body?.name);
    const rating = sanitizeRating(req.body?.rating);
    const comment = sanitizeMessage(req.body?.message ?? req.body?.comment);

    if (!comment) {
      return res.status(400).json({ error: 'Please share a quick note about the pizza.' });
    }

    if (!Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Please choose how much you loved the pizza.' });
    }

    const entry = {
      name: name || 'Anonymous pizza fan',
      comment,
      message: comment,
      rating,
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
      source: 'web',
    };

    try {
      const docRef = await db.collection(FEEDBACK_COLLECTION).add(entry);
      const responseEntry = {
        id: docRef.id || `feedback-${entry.createdAtMs}`,
        name: entry.name,
        comment: entry.comment,
        message: entry.comment,
        rating: entry.rating,
        createdAt: entry.createdAt,
      };
      return res.status(200).json({ entry: responseEntry });
    } catch (error) {
      console.warn('[crowdfund.pizza-feedback] write error', error.message);
      return res.status(500).json({ error: 'Failed to save pizza feedback.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
