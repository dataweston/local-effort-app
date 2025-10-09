require('dotenv').config({ path: '../../.env' });

const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');

const FALLBACK_STATUS = {
  goal: 1000,
  pizzasSold: 0,
  funders: [],
  source: 'fallback',
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firestore: db } = getFirebaseAdmin();
  if (!db) {
    return res.status(200).json(FALLBACK_STATUS);
  }

  try {
    const docRef = db.collection('crowdfund').doc('status');
    const doc = await docRef.get();
    if (!doc.exists) {
      const defaultData = { goal: 1000, pizzasSold: 0, funders: [] };
      await docRef.set(defaultData);
      return res.status(200).json(defaultData);
    }
    const data = doc.data() || {};
    return res.status(200).json(data);
  } catch (error) {
    console.warn('[crowdfund.status] failed to load status', error.message);
    return res.status(200).json(FALLBACK_STATUS);
  }
};
