// backend/api/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');n
const { createClient } = require('@sanity/client');
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: 'production',
  useCdn: false, // `false` for write operations
  token: process.env.SANITY_API_TOKEN, // A token with write access
});
const { Client, Environment } = require('square'); // Import Square Client
const { v4: uuidv4 } = require('uuid'); // Import UUID for idempotency

// --- INITIALIZE FIREBASE ---
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// --- INITIALIZE SQUARE CLIENT ---
const squareClient = new Client({
  environment: Environment.Sandbox, // Use Sandbox for testing, change to Environment.Production for real payments
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

const app = express();

// --- CORS CONFIGURATION ---
const allowedOrigins = ['https://local-effort-app.vercel.app'];
const corsOptions = { origin: allowedOrigins };
app.use(cors(corsOptions));
app.use(express.json());

// --- API ENDPOINTS ---

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

    res.json({ success: true, newTotal: pizzasSold });

  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ error: 'Failed to update database after payment.' });
  }
});


module.exports = app;