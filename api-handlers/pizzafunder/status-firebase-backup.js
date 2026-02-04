/**
 * GET /api/pizzafunder/status
 * Returns current pizza funding totals from Firestore
 * Simple, reliable backend API - no client-side Firebase needed
 */

const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firestore } = getFirebaseAdmin();
  
  if (!firestore) {
    // Graceful fallback - return safe defaults
    return res.status(200).json({
      pizzas: 0,
      backers: 0,
      goal: 1000,
      source: 'fallback',
    });
  }

  try {
    const doc = await firestore
      .collection('aggregates')
      .doc('crowdfunding')
      .get();

    if (!doc.exists) {
      return res.status(200).json({
        pizzas: 0,
        backers: 0,
        goal: 1000,
        source: 'default',
      });
    }

    const data = doc.data();
    
    return res.status(200).json({
      pizzas: Number(data.pizzas) || 0,
      backers: Number(data.backers) || 0,
      goal: Number(data.goal) || 1000,
      lastUpdated: data.lastUpdated || null,
      source: 'firestore',
    });
  } catch (error) {
    console.error('[pizzafunder.status] Error fetching totals:', error.message);
    
    // Still return graceful fallback
    return res.status(200).json({
      pizzas: 0,
      backers: 0,
      goal: 1000,
      source: 'error-fallback',
      error: 'Failed to fetch current totals',
    });
  }
};
