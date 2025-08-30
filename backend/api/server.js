// backend/api/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { createClient } = require('@sanity/client');
const fs = require('fs');
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: 'production',
  useCdn: false, // `false` for write operations
  token: process.env.SANITY_API_TOKEN, // A token with write access
  apiVersion: '2024-01-01',
});
// Import Square Client (defensive: warn if not available)
let Client, Environment;
try {
  const squarePkg = require('square');
  Client = squarePkg.Client;
  Environment = squarePkg.Environment;
} catch (err) {
  console.warn('Square SDK not available or failed to load:', err.message);
}
const { v4: uuidv4 } = require('uuid'); // Import UUID for idempotency

// --- INITIALIZE FIREBASE ---
let db;
// Support either raw JSON in FIREBASE_SERVICE_ACCOUNT_JSON or a path to a JSON file in FIREBASE_SERVICE_ACCOUNT_PATH
try {
  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (fs.existsSync(path)) {
      const raw = fs.readFileSync(path, 'utf8');
      serviceAccount = JSON.parse(raw);
    } else {
      console.warn(`FIREBASE_SERVICE_ACCOUNT_PATH set but file does not exist: ${path}`);
    }
  }

  if (serviceAccount) {
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
  } else {
    console.warn('Firebase service account not provided — Firestore will be unavailable in this process.');
  }
} catch (err) {
  console.error('Failed to initialize Firebase admin:', err.message);
  console.warn('Firestore will be unavailable in this process.');
}

// --- INITIALIZE SQUARE CLIENT (defensive) ---
let squareClient = null;
if (Client) {
  // Resolve environment: prefer SDK Environment enum when available
  const envName = process.env.SQUARE_ENVIRONMENT || 'Sandbox';
  let resolvedEnv = null;
  if (Environment && Environment[envName]) {
    resolvedEnv = Environment[envName];
  } else if (Environment && Environment.Sandbox) {
    resolvedEnv = Environment.Sandbox;
  } else {
    // fall back to string (some SDK versions tolerate this)
    resolvedEnv = envName;
  }

  squareClient = new Client({
    environment: resolvedEnv,
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
  });
} else {
  console.warn('Square client not initialized because SDK is missing. /api/crowdfund endpoints that use Square will return errors.');
}

const app = express();

// --- CORS CONFIGURATION ---
const allowedOrigins = ['https://local-effort-app.vercel.app'];
const corsOptions = { origin: allowedOrigins };
app.use(cors(corsOptions));
app.use(express.json());

// --- API ENDPOINTS ---

// Mount the standalone search-images handler (from root /api) so the
// backend will serve /api/search-images when deployed via Vercel.
try {
  // require the handler from the repository root api/search-images.js
  // path relative to this file: ../../api/search-images.js
  // The handler exports a function (req, res)
  // We mount it at GET /api/search-images to preserve the original behavior.
  // eslint-disable-next-line global-require
  const searchImagesHandler = require('../../api/search-images.js');
  if (typeof searchImagesHandler === 'function') {
    app.get('/api/search-images', async (req, res) => {
      try {
        // Delegate to the handler and await if it returns a promise
        await Promise.resolve(searchImagesHandler(req, res));
      } catch (err) {
        console.error('search-images handler runtime error:', err);
        // Ensure we always return JSON on error (avoid HTML error pages)
        res.status(500).json({ error: 'search-images failed', details: String(err) });
      }
    });
  }
} catch (err) {
  console.warn('search-images handler not available:', err.message);
}

// Helpful startup log for local debugging
if (require.main === module) {
  console.log('Starting backend API (local) — routes mounted: /api/crowdfund/status, /api/crowdfund/contribute, /api/crowdfund/confirm-payment, /api/search-images (if available)');
}

// This endpoint remains the same
app.get('/api/crowdfund/status', async (req, res) => {
  // ... (No changes to this function)
  try {
    const docRef = db.collection('crowdfund').doc('status');
    const doc = await docRef.get();
    if (!doc.exists) {
      const defaultData = { goal: 1000, pizzasSold: 0, funders: [] };
      await db.collection('crowdfund').doc('status').set(defaultData);
      return res.json(defaultData);
    }
    res.json(doc.data());
  } catch (error) {
    console.error("Error fetching status:", error);
    res.status(500).json({ error: 'Failed to read database.' });
  }
});

// --- THIS ENDPOINT IS FULLY REBUILT ---
app.post('/api/crowdfund/contribute', async (req, res) => {
  const { items, totalAmount } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  try {
    // Create line items for the Square Order from the cart
    const lineItems = items.map(item => ({
      name: item.name,
      quantity: '1',
      basePriceMoney: {
        amount: item.price * 100, // Square expects amounts in cents
        currency: 'USD',
      },
    }));

    if (!squareClient) {
      return res.status(500).json({ error: 'Payment provider not configured on this server.' });
    }

    // Create a payment link with Square
    const response = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: uuidv4(), // Prevents accidental duplicate charges
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        lineItems: lineItems,
      },
      checkoutOptions: {
        // Redirect the user back to your fundraiser page after payment
        redirectUrl: 'https://local-effort-app.vercel.app/#/crowdfunding?payment=success',
        // Optional: Ask for shipping address if you need to mail items
        askForShippingAddress: true, 
      },
    });

    // Send the URL of the payment link back to the frontend
    res.json({
      url: response.result.paymentLink.url,
    });

  } catch (error) {
    console.error("Square API Error:", error);
    res.status(500).json({ error: 'Failed to create payment link.' });
  }
});

// This endpoint is NEW. It will be used for webhooks in the future to confirm payments.
// For now, it will handle the client-side confirmation.
app.post('/api/crowdfund/confirm-payment', async (req, res) => {
  const { items, funderName } = req.body;
  
  try {
    const pizzasInCart = items.filter(p => p.type === 'pizza').reduce((sum, item) => sum + (item.pizzaCount || 1), 0);
    if (pizzasInCart === 0) {
        return res.json({ success: true, message: "No pizza items to update." });
    }

  if (!db) return res.status(500).json({ error: 'Database not configured on this server.' });

  const docRef = db.collection('crowdfund').doc('status');
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw "Document does not exist!";
      
      const newPizzasSold = (doc.data().pizzasSold || 0) + pizzasInCart;
      const newFunders = doc.data().funders || [];
      newFunders.push({ name: funderName, date: new Date().toISOString() });
      
      transaction.update(docRef, { 
        pizzasSold: newPizzasSold,
        funders: newFunders
      });
    });

  // Return the new total after successful transaction
  const updatedDoc = await db.collection('crowdfund').doc('status').get();
  const updatedTotal = updatedDoc.exists ? (updatedDoc.data().pizzasSold || 0) : null;
  res.json({ success: true, newTotal: updatedTotal });

  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ error: 'Failed to update database after payment.' });
  }
});


// Start server when run directly
const PORT = process.env.PORT || 3001;
if (require.main === module) {
  if (!db) console.warn('Firestore not initialized — some endpoints will fail without FIREBASE_SERVICE_ACCOUNT_JSON');
  app.listen(PORT, () => console.log(`Backend API listening on http://localhost:${PORT}`));
}

module.exports = app;