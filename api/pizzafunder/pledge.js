/**
 * POST /api/pizzafunder/pledge
 * 
 * Handles pizza pledge payments via Square
 * Simplified from crowdfund/confirm-payment - follows SalePage pattern
 */

const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');

// Import Square Client (defensive: handle varying export shapes)
let Client, Environment;
try {
  const squarePkg = require('square');
  Client = squarePkg.Client || (squarePkg.default && squarePkg.default.Client);
  Environment = squarePkg.Environment || (squarePkg.default && squarePkg.default.Environment) || null;
} catch (err) {
  console.warn('Square SDK not available:', err && err.message);
}

const sanitizeName = (value) => {
  const str = String(value || '').trim();
  return str ? str.slice(0, 120) : 'Anonymous Backer';
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firestore } = getFirebaseAdmin();
  
  if (!firestore) {
    return res.status(503).json({ error: 'Database not available' });
  }

  if (!Client) {
    return res.status(503).json({ error: 'Payment processing unavailable' });
  }

  const {
    pizzaCount = 1,
    funderName,
    email,
    phone,
    notes,
    rewardPreference,
    sourceId, // Square payment token from tokenize()
    totalCents,
  } = req.body || {};

  const sanitizedName = sanitizeName(funderName);
  const safeEmail = typeof email === 'string' ? email.trim().slice(0, 120) : '';
  const safePhone = typeof phone === 'string' ? phone.trim().slice(0, 30) : '';
  const safeNotes = typeof notes === 'string' ? notes.trim().slice(0, 500) : '';
  const safeRewardPref = typeof rewardPreference === 'string' ? rewardPreference.trim().slice(0, 120) : '';
  
  const pizzas = Math.max(1, parseInt(pizzaCount, 10) || 1);
  const amount = Math.max(0, parseInt(totalCents, 10) || 0);

  if (!sourceId) {
    return res.status(400).json({ error: 'Payment token required' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    // Initialize Square client
    const envName = process.env.SQUARE_ENVIRONMENT || 'Sandbox';
    let resolvedEnv = null;
    if (Environment && Environment[envName]) {
      resolvedEnv = Environment[envName];
    } else if (Environment && Environment.Sandbox) {
      resolvedEnv = Environment.Sandbox;
    } else {
      resolvedEnv = envName;
    }

    const squareClient = new Client({
      environment: resolvedEnv,
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
    });

    // Process payment via Square
    const paymentResponse = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: `pledge-${Date.now()}-${Math.random().toString(36)}`,
      amountMoney: {
        amount: BigInt(amount),
        currency: 'USD',
      },
      note: `Pizza Pledge: ${pizzas} pizza${pizzas > 1 ? 's' : ''}`,
      buyerEmailAddress: safeEmail || undefined,
    });

    if (!paymentResponse.result.payment) {
      throw new Error('Payment failed');
    }

    const payment = paymentResponse.result.payment;

    // Record the pledge in Firestore
    const pledgeRef = await firestore
      .collection('crowdfund_pledges')
      .add({
        funderName: sanitizedName,
        email: safeEmail,
        phone: safePhone,
        notes: safeNotes,
        rewardPreference: safeRewardPref,
        pizzaCount: pizzas,
        amountCents: amount,
        paymentId: payment.id,
        status: payment.status || 'COMPLETED',
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
      });

    // Update aggregates (atomic increment)
    const aggregateRef = firestore.collection('aggregates').doc('crowdfunding');
    
    await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(aggregateRef);
      
      const currentPizzas = doc.exists ? (Number(doc.data().pizzas) || 0) : 0;
      const currentBackers = doc.exists ? (Number(doc.data().backers) || 0) : 0;
      const goal = doc.exists ? (Number(doc.data().goal) || 1000) : 1000;

      transaction.set(aggregateRef, {
        pizzas: currentPizzas + pizzas,
        backers: currentBackers + 1,
        goal,
        lastUpdated: new Date().toISOString(),
      }, { merge: true });
    });

    return res.status(200).json({
      success: true,
      pledgeId: pledgeRef.id,
      pizzas,
      message: `Thank you for backing ${pizzas} pizza${pizzas > 1 ? 's' : ''}!`,
    });
  } catch (error) {
    console.error('[pizzafunder.pledge] Error:', error.message);
    return res.status(500).json({ 
      error: error.message || 'Failed to process pledge',
    });
  }
};
