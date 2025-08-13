// backend/api/server.js

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// --- FIREBASE SETUP ---
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const app = express();

// --- CORS CONFIGURATION ---
// Define the specific URL of your frontend application
const allowedOrigins = ['https://local-effort-app.vercel.app']; // <-- IMPORTANT: Replace with your REAL frontend URL if different

const corsOptions = {
  origin: allowedOrigins
};

// --- MIDDLEWARE ---
app.use(cors(corsOptions)); // Use the specific CORS options
app.use(express.json());

// --- API ENDPOINTS ---

// GET /api/crowdfund/status
app.get('/api/crowdfund/status', async (req, res) => {
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

// POST /api/crowdfund/contribute
app.post('/api/crowdfund/contribute', async (req, res) => {
  const { productName, amount, funderName } = req.body;

  if (!productName || !amount || !funderName) {
    return res.status(400).json({ error: 'Missing contribution details.' });
  }

  const paymentUrl = "http://your-frontend-domain.com/crowdfunding?payment=success_demo";

  try {
    const docRef = db.collection('crowdfund').doc('status');
    
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) {
        throw "Document does not exist!";
      }
      
      const newPizzasSold = (doc.data().pizzasSold || 0) + 1;
      const newFunders = doc.data().funders || [];
      newFunders.push({ name: funderName, date: new Date().toISOString() });
      
      transaction.update(docRef, { 
        pizzasSold: newPizzasSold,
        funders: newFunders
      });
    });

    res.json({ paymentUrl });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: 'Failed to update database.' });
  }
});

// Export the app for Vercel
module.exports = app;