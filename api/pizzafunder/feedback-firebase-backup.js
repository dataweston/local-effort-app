/**
 * GET /api/pizzafunder/feedback?limit=8
 * POST /api/pizzafunder/feedback
 * 
 * Manages pizza feedback entries - similar to /api/crowdfund/pizza-feedback
 * but simplified and following SalePage pattern
 */

const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');

const FEEDBACK_COLLECTION = 'crowdfund_feedback';

const sanitizeName = (value) => {
  const str = String(value || '').trim();
  return str ? str.slice(0, 120) : 'Anonymous pizza fan';
};

const sanitizeMessage = (value) => {
  const str = String(value || '').trim();
  return str.slice(0, 600);
};

const sanitizeRating = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 5;
  const int = Math.round(num);
  return Math.max(1, Math.min(5, int));
};

module.exports = async (req, res) => {
  const { firestore } = getFirebaseAdmin();

  // GET - List feedback entries
  if (req.method === 'GET') {
    if (!firestore) {
      return res.status(200).json({ entries: [], source: 'unavailable' });
    }

    let limit = parseInt(req.query?.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 8;
    limit = Math.min(limit, 20);

    try {
      const snapshot = await firestore
        .collection(FEEDBACK_COLLECTION)
        .orderBy('createdAtMs', 'desc')
        .limit(limit)
        .get();

      const entries = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: sanitizeName(data.name),
          comment: sanitizeMessage(data.comment || data.message),
          rating: sanitizeRating(data.rating),
          createdAt: data.createdAt || null,
        };
      });

      return res.status(200).json({ entries, source: 'firestore' });
    } catch (error) {
      console.error('[pizzafunder.feedback] GET error:', error.message);
      return res.status(200).json({ entries: [], source: 'error', error: error.message });
    }
  }

  // POST - Submit new feedback
  if (req.method === 'POST') {
    if (!firestore) {
      return res.status(503).json({ error: 'Feedback storage unavailable' });
    }

    const name = sanitizeName(req.body?.name);
    const rating = sanitizeRating(req.body?.rating);
    const comment = sanitizeMessage(req.body?.comment || req.body?.message);

    if (!comment) {
      return res.status(400).json({ error: 'Please share a quick note about the pizza.' });
    }

    try {
      const docRef = await firestore
        .collection(FEEDBACK_COLLECTION)
        .add({
          name,
          comment,
          rating,
          createdAt: new Date().toISOString(),
          createdAtMs: Date.now(),
        });

      return res.status(201).json({
        success: true,
        id: docRef.id,
        feedback: { id: docRef.id, name, comment, rating },
      });
    } catch (error) {
      console.error('[pizzafunder.feedback] POST error:', error.message);
      return res.status(500).json({ error: 'Failed to save feedback' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
