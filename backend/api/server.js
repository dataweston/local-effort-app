// backend/api/server.js
/* eslint-disable no-console */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');

// Fallback: if critical vars are missing, also try loading project root .env
if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.BREVO_API_KEY) {
  try {
    const rootEnvPath = path.resolve(__dirname, '../../.env');
    require('dotenv').config({ path: rootEnvPath });
  } catch (e) {
    // no-op
  }
}

// Lazily create Sanity client to avoid throwing during module load when
// SANITY_PROJECT_ID is not provided in the environment (this prevents
// serverless functions from failing with "Configuration must contain `projectId`").
let sanityClient = null;
function getSanityClient() {
  if (sanityClient) return sanityClient;
  const projectId = process.env.SANITY_PROJECT_ID;
  if (!projectId) {
    console.warn('SANITY_PROJECT_ID not set — Sanity client unavailable.');
    return null;
  }
  const dataset = process.env.SANITY_DATASET || 'localeffort';
  sanityClient = createClient({
    projectId,
    dataset,
    useCdn: false, // `false` for write operations
    token: process.env.SANITY_API_TOKEN, // A token with write access
    apiVersion: '2024-01-01',
  });
  return sanityClient;
}
// Import Square Client (defensive: handle varying export shapes across versions)
let Client, Environment;
try {
  const squarePkg = require('square');
  Client = squarePkg.Client || (squarePkg.default && squarePkg.default.Client);
  Environment = squarePkg.Environment || (squarePkg.default && squarePkg.default.Environment) || null;
} catch (err) {
  console.warn('Square SDK not available or failed to load:', err && err.message);
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

// --- Auth middleware for admin-only endpoints (Gallant tools) ---
const GALLANT_ALLOWED = new Set([
  'dataweston@gmail.com',
  'colsen03@gmail.com',
  ...(process.env.GALLANT_ALLOWED_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]);

async function requireAllowedUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'missing-auth' });
    if (!admin?.auth) return res.status(500).json({ error: 'auth-unavailable' });
    const decoded = await admin.auth().verifyIdToken(m[1]);
    const email = decoded?.email;
    if (!email || !GALLANT_ALLOWED.has(email)) return res.status(403).json({ error: 'forbidden' });
    req.user = { uid: decoded.uid, email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid-auth' });
  }
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
  console.log('Square client initialized:', { env: envName, hasToken: !!process.env.SQUARE_ACCESS_TOKEN });
} else {
  console.warn('Square client not initialized because SDK is missing. /api/crowdfund endpoints that use Square will return errors.');
}

const app = express();

// --- CORS CONFIGURATION ---
const allowedOrigins = [
  'https://local-effort-app.vercel.app',
  'https://www.localeffortfood.com',
  'https://localeffortfood.com'
];
const corsOptions = { origin: allowedOrigins };
app.use(cors(corsOptions));
app.use(express.json());

// --- API ENDPOINTS ---

// Diagnostic endpoint (safe): reports whether required env vars are present
// and attempts a lightweight Cloudinary ping if configured. Do NOT expose
// credentials. This endpoint is intended for temporary debugging in staging.
app.get('/api/_diag', async (req, res) => {
  try {
  const hasCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  const sanityAvailable = !!getSanityClient();
    const result = { ok: true, hasCloudinary };
  result.sanity = { available: sanityAvailable };
    result.square = {
      sdkLoaded: !!Client,
      clientInitialized: !!squareClient,
      hasToken: !!process.env.SQUARE_ACCESS_TOKEN,
      env: process.env.SQUARE_ENVIRONMENT || 'Sandbox',
    };
    if (hasCloudinary) {
      try {
        // require cloudinary lazily to avoid issues when not installed in some environments
        // eslint-disable-next-line global-require
        const cloudinary = require('cloudinary').v2;
        // Use configured cloudinary if available
        await cloudinary.api.ping();
        result.cloudinary = { ping: 'ok' };
      } catch (err) {
        // don't include error stack or secrets — only a short message
        result.cloudinary = { ping: 'failed', message: String(err).slice(0, 200) };
      }
    }
    res.json(result);
  } catch (err) {
    console.error('Diag endpoint error:', err);
    res.status(500).json({ ok: false, error: 'diag-failed' });
  }
});

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

// --- Proxy About page data from Sanity (to avoid client-side CORS) ---
app.get('/api/about', async (req, res) => {
  try {
    const sanity = getSanityClient();
    if (!sanity) return res.status(500).json({ error: 'sanity-not-configured' });
    const query = `{
      "page": *[_type == "page" && slug.current == "about-us"][0]{ title, introduction },
      "persons": *[_type == "person"]{ name, role, bio, image{asset->{_ref}}, headshot{ asset{ public_id }, alt } }
    }`;
    const data = await sanity.fetch(query);
    return res.json(data || {});
  } catch (err) {
    console.error('About proxy error:', err);
    return res.status(500).json({ error: 'about-fetch-failed' });
  }
});

// Mount support search endpoint (Supabase-powered hybrid search)
try {
  const { registerSupportSearch } = require('./supportSearch');
  if (registerSupportSearch) registerSupportSearch(app);
} catch (err) {
  console.warn('support search not available:', err?.message);
}

// Mount support ingestion endpoints (manual sync + webhook)
try {
  const { registerSupportIngest } = require('./supportIngest');
  if (registerSupportIngest) registerSupportIngest(app);
} catch (err) {
  console.warn('support ingest not available:', err?.message);
}

// (removed legacy lightweight messages/submit — unified below with Brevo-enabled version)

// Helpful startup log for local debugging
// if (require.main === module) {
//   console.info('Backend API starting (local)');
// }

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
  const { items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  try {
    // Create line items for the Square Order from the cart
    const lineItems = items.map(item => ({
      name: item.name,
      quantity: String(item.quantity && item.quantity > 0 ? item.quantity : (item.pizzaCount || 1)),
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

// --- EMAIL/MESSAGING ENDPOINTS (Brevo + Sanity mirror) ---

function getBrevoHeaders() {
  const key = process.env.BREVO_API_KEY;
  if (!key) return null;
  return {
    'api-key': key,
    'content-type': 'application/json',
    accept: 'application/json',
  };
}

// Create or update a contact in Brevo and mirror in Sanity
async function upsertContact({ email, firstName, lastName, phone }) {
  const headers = getBrevoHeaders();
  if (!headers) throw new Error('BREVO_API_KEY is not configured on the server');
  const body = {
    email,
    attributes: {
      FIRSTNAME: firstName || undefined,
      LASTNAME: lastName || undefined,
      SMS: phone || undefined,
    },
    updateEnabled: true,
  };
  const resp = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  // 204/201/202 possible; treat 400 email-invalid gracefully
  if (!resp.ok && resp.status !== 400) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Brevo contacts error ${resp.status}: ${text}`);
  }
  // Mirror in Sanity
  const sc = getSanityClient();
  if (sc) {
    try {
      await sc.createIfNotExists({
        _id: `contact-${email}`,
        _type: 'contact',
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed to mirror contact in Sanity:', e && e.message);
    }
  }
}

// Public: customer form submission -> store + notify team via Brevo
app.post('/api/messages/submit', async (req, res) => {
  try {
  const { name, email, phone, subject, message, type = 'general', sendCopy = false } = req.body || {};
    if (!email || !message) return res.status(400).json({ error: 'Missing email or message' });

    const [firstName, ...rest] = (name || '').split(' ');
    const lastName = rest.join(' ');

    await upsertContact({ email, firstName, lastName, phone });

    // Mirror message in Sanity
    const sc = getSanityClient();
    let msgDoc = null;
    if (sc) {
      try {
        msgDoc = await sc.create({
          _type: 'message',
          direction: 'inbound',
          status: 'open',
          subject: subject || '(no subject)',
          bodyText: message,
          fromEmail: email,
          fromName: name || null,
          phone: phone || null,
          channel: 'email',
          inbox: 'general',
          messageType: type,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Failed to write message to Sanity:', e && e.message);
      }
    }

    // Notify team via Brevo transactional email
    const headers = getBrevoHeaders();
    if (!headers) return res.status(500).json({ error: 'Email service not configured' });
    const teamEmail = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
    const senderEmail = process.env.SENDER_EMAIL || teamEmail;
    if (!teamEmail) return res.status(500).json({ error: 'No TEAM/SUPPORT inbox configured on server' });

    const htmlContent = `
      <p>New inquiry from <strong>${name || email}</strong></p>
      <p><strong>Email:</strong> ${email}</p>
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
      <p><strong>Type:</strong> ${type}</p>
      <hr />
      <pre style="white-space:pre-wrap;font-family:inherit">${(message || '').replace(/</g, '&lt;')}</pre>
    `;
    const payload = {
      to: [{ email: teamEmail }],
      sender: { email: senderEmail, name: 'Local Effort' },
      subject: subject || 'New inquiry',
      htmlContent,
      replyTo: { email, name: name || email },
      tags: ['inquiry', type].filter(Boolean),
      headers: msgDoc?._id ? { 'X-Message-Id': msgDoc._id } : undefined,
    };
    if (sendCopy && email) {
      payload.cc = [{ email, name: name || email }];
    }
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return res.status(502).json({ error: 'Failed to send email', details: text });
    }

    return res.json({ ok: true, id: msgDoc?._id || null });
  } catch (err) {
    console.error('messages/submit error', err);
    return res.status(500).json({ error: 'submit-failed' });
  }
});

// Basic subscribe endpoint: accepts { email, firstName?, lastName?, phone? }
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email, firstName, lastName, phone } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Missing email' });
    await upsertContact({ email, firstName, lastName, phone });
    return res.json({ ok: true });
  } catch (err) {
    console.error('subscribe error', err);
    return res.status(500).json({ error: 'subscribe-failed' });
  }
});

// --- EVENTS WORKFLOW ---
function icsEscape(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatDateBasic(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function buildICS({ uid, summary, description, location, startDate, endDate, allDay = true, method = 'PUBLISH' }) {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `METHOD:${method}`,
    'PRODID:-//Local Effort//Event Request//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
  ];
  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateBasic(startDate)}`);
    if (endDate) lines.push(`DTEND;VALUE=DATE:${formatDateBasic(endDate)}`);
  } else {
    const dt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    lines.push(`DTSTART:${dt(startDate)}`);
    if (endDate) lines.push(`DTEND:${dt(endDate)}`);
  }
  if (summary) lines.push(`SUMMARY:${icsEscape(summary)}`);
  if (location) lines.push(`LOCATION:${icsEscape(location)}`);
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function safeDateFromInput(dateStr) {
  if (!dateStr) return null;
  // Accept YYYY-MM-DD or ISO date strings
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function hashKey(str) {
  // lightweight hash
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

// Public endpoint: accept event request and create pending Firestore event, Sanity message, and notify via Brevo
app.post('/api/events/request', async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone,
      eventDate, city, state, zip,
      eventType, guestCount, notes,
      sendCopy = false,
    } = req.body || {};

    if (!email || !firstName || !lastName || !phone) {
      return res.status(400).json({ error: 'missing-required-fields' });
    }

    const name = `${firstName} ${lastName}`.trim();
    const startDate = safeDateFromInput(eventDate);
    const location = [city, state, zip].filter(Boolean).join(', ');
    const summary = [eventType || 'Event', guestCount ? `(${guestCount} guests)` : null, startDate ? `on ${eventDate}` : null]
      .filter(Boolean).join(' ');
    const details = [
      eventType ? `Event Type: ${eventType}` : null,
      startDate ? `Event Date: ${eventDate}` : null,
      guestCount ? `Estimated Guests: ${guestCount}` : null,
      location ? `Location: ${location}` : null,
      '',
      'Notes:',
      notes || '(none)'
    ].filter((l) => l !== null).join('\n');

    // Upsert contact (Brevo + Sanity mirror)
    const [first, ...rest] = (name || '').split(' ');
    await upsertContact({ email, firstName: first, lastName: rest.join(' '), phone });

    // Dedupe by email+date+city within 48h
    const dedupeKey = hashKey(`${email.toLowerCase()}|${eventDate || ''}|${(city || '').toLowerCase()}`);
    let existingId = null;
    if (db) {
      const snap = await db.collection('events').where('dedupeKey', '==', dedupeKey).limit(1).get().catch(() => null);
      if (snap && !snap.empty) {
        const doc = snap.docs[0];
        const createdAt = doc.get('submittedAt');
        const ts = createdAt && createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        if (ts && (Date.now() - ts.getTime()) < 1000 * 60 * 60 * 48) {
          existingId = doc.id;
        }
      }
    }

    // Mirror message in Sanity
    const sc = getSanityClient();
    let msgDoc = null;
    if (sc) {
      try {
        msgDoc = await sc.create({
          _type: 'message',
          direction: 'inbound',
          status: 'open',
          subject: summary || 'Event Request',
          bodyText: details,
          fromEmail: email,
          fromName: name,
          phone: phone || null,
          channel: 'form',
          inbox: 'events',
          messageType: 'event-request',
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Failed to write event-request message to Sanity:', e && e.message);
      }
    }

    // Create or reuse Firestore event
    let eventId = existingId;
    if (db && !existingId) {
      const payload = {
        title: summary || 'Event Request',
        date: startDate || new Date(),
        status: 'pending',
        notes: details,
        contact: { name, email, phone },
        location: location || null,
        eventType: eventType || null,
        guestCount: guestCount ? Number(guestCount) : null,
        source: 'website',
        submittedAt: new Date(),
        dedupeKey,
      };
      const ref = await db.collection('events').add(payload);
      eventId = ref.id;
    }

    // Email team + optional copy to client with ICS attachment
    const headers = getBrevoHeaders();
    if (headers) {
      const teamEmail = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
      const senderEmail = process.env.SENDER_EMAIL || teamEmail;
      const html = `
        <p>New <strong>Event Request</strong> from <strong>${name}</strong></p>
        <p><strong>Email:</strong> ${email}${phone ? ` · <strong>Phone:</strong> ${phone}` : ''}</p>
        <p><strong>Summary:</strong> ${summary || '(n/a)'}${location ? ` · <strong>Location:</strong> ${location}` : ''}</p>
        <hr />
        <pre style="white-space:pre-wrap;font-family:inherit">${(details || '').replace(/</g, '&lt;')}</pre>
        ${eventId ? `<p>Event ID: ${eventId}</p>` : ''}
      `;
      const attachments = [];
      if (startDate) {
        const ics = buildICS({
          uid: `evt-${eventId || Date.now()}@localeffortfood.com`,
          summary: summary || 'Event Request',
          description: `${name} — ${email}${phone ? `, ${phone}` : ''}\n\n${details}`,
          location,
          startDate,
          allDay: true,
        });
        attachments.push({ name: 'event-request.ics', content: Buffer.from(ics).toString('base64') });
      }
      const payload = {
        to: [{ email: teamEmail }],
        sender: { email: senderEmail, name: 'Local Effort' },
        subject: summary || 'New Event Request',
        htmlContent: html,
        replyTo: { email, name },
        tags: ['event-request'],
        attachment: attachments,
      };
      if (sendCopy && email) {
        payload.cc = [{ email, name }];
      }
      await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers, body: JSON.stringify(payload) }).catch(() => {});
    }

    return res.json({ ok: true, eventId, sanityMessageId: msgDoc?._id || null });
  } catch (err) {
    console.error('events/request error', err);
    return res.status(500).json({ error: 'event-request-failed' });
  }
});

// Admin/Tool endpoint: confirm or update an event and optionally publish to public events in Sanity
app.post('/api/events/confirm', requireAllowedUser, async (req, res) => {
  try {
    const { eventId, status = 'confirmed', startDateTime, endDateTime, location, visibility = 'private', ticketsUrl, description } = req.body || {};
    if (!eventId) return res.status(400).json({ error: 'missing-eventId' });
    if (!db) return res.status(500).json({ error: 'firestore-unavailable' });

    const ref = db.collection('events').doc(eventId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'not-found' });

  const updates = { status };
    if (startDateTime) updates.date = new Date(startDateTime);
    if (location !== undefined) updates.location = location;
  // set isPublic flag; publicEventId handled below
  updates.isPublic = visibility === 'public';
  await ref.update(updates);

    let publicEventId = null;
    if (visibility === 'public') {
      const sc = getSanityClient();
      if (!sc) return res.status(500).json({ error: 'sanity-unavailable' });
      const ev = snap.data();
      const start = startDateTime ? new Date(startDateTime) : (ev.date?.toDate ? ev.date.toDate() : new Date(ev.date));
      const end = endDateTime ? new Date(endDateTime) : null;
      const toDateOnly = (d) => d.toISOString().slice(0, 10);
      const blocks = description ? [{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: String(description), marks: [] }] }] : [{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: ev.notes || '', marks: [] }] }];
      const doc = await sc.create({
        _type: 'publicEvent',
        location: location || ev.location || '',
        startDate: toDateOnly(start),
        endDate: end ? toDateOnly(end) : undefined,
        foodType: ev.eventType || undefined,
        ticketsUrl: ticketsUrl || undefined,
        description: blocks,
        firestoreEventId: eventId,
      });
      publicEventId = doc._id;
      await ref.update({ publicEventId });
    } else {
      // mark as private: clear publicEventId in Firestore; leave any existing Sanity doc untouched for now
      await ref.update({ publicEventId: null });
    }

    // Send confirmation email with ICS to client if we have their contact
    try {
      const ev = (await ref.get()).data();
      const contact = ev && ev.contact;
      const headers = getBrevoHeaders();
      if (headers && contact && contact.email) {
        const title = ev.title || 'Your Event';
        const start = startDateTime ? new Date(startDateTime) : (ev.date?.toDate ? ev.date.toDate() : new Date(ev.date));
        const ics = buildICS({
          uid: `evt-${eventId}@localeffortfood.com`,
          summary: title,
          description: ev.notes || '',
          location: location || ev.location || '',
          startDate: start,
          allDay: true,
        });
        const payload = {
          to: [{ email: contact.email, name: contact.name }],
          sender: { email: process.env.SENDER_EMAIL || contact.email, name: 'Local Effort' },
          subject: `Confirmed: ${title}`,
          htmlContent: `<p>We’ve confirmed your event. Details below.</p><pre style="white-space:pre-wrap;font-family:inherit">${(ev.notes || '').replace(/</g, '&lt;')}</pre>`,
          attachment: [{ name: 'event.ics', content: Buffer.from(ics).toString('base64') }],
          tags: ['event-confirmed'],
        };
        await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers, body: JSON.stringify(payload) });
      }
    } catch (_e) {
      // ignore email errors
    }

    return res.json({ ok: true, eventId, isPublic: visibility === 'public', publicEventId });
  } catch (err) {
    console.error('events/confirm error', err);
    return res.status(500).json({ error: 'event-confirm-failed' });
  }
});

// Create a blog post in Sanity. Accepts either { title, bodyBlocks?, text? }.
// If `text` is provided, convert to a simple Portable Text block array.
// Optional: { publishedAt, emailOnPublish, emailTo[] }
app.post('/api/blog/publish', async (req, res) => {
  try {
    const { title, bodyBlocks, text, publishedAt, emailOnPublish = false, emailTo } = req.body || {};
    if (!title) return res.status(400).json({ error: 'missing-title' });
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'sanity-not-configured' });

    const blocks = Array.isArray(bodyBlocks) && bodyBlocks.length
      ? bodyBlocks
      : [{
          _type: 'block',
          style: 'normal',
          children: [{ _type: 'span', text: (text || '').trim(), marks: [] }],
        }];

    const slugBase = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
    const now = new Date().toISOString();
    const doc = await sc.create({
      _type: 'blogPost',
      title,
      slug: { current: `${slugBase}-${Date.now().toString(36)}` },
      body: blocks,
      publishedAt: publishedAt || now,
      emailOnPublish: !!emailOnPublish,
    });

    let emailed = null;
    if (emailOnPublish) {
      const headers = getBrevoHeaders();
      if (headers) {
        const recipients = Array.isArray(emailTo) && emailTo.length
          ? emailTo
          : (process.env.BLOG_ANNOUNCE_TO || '').split(',').map(s => s.trim()).filter(Boolean);
        if (recipients.length) {
          const base = (process.env.PUBLIC_URL || 'https://local-effort-app.vercel.app');
          const url = base.replace(/\/$/, '') + '/weekly/' + doc.slug.current;
          const snippet = (text || JSON.stringify(blocks)).slice(0, 400);
          const payload = {
            to: recipients.map((e) => ({ email: e })),
            sender: { email: process.env.SENDER_EMAIL || recipients[0], name: 'Local Effort' },
            subject: `New post: ${title}`,
            htmlContent: `<h2>${title}</h2><p>${snippet}…</p><p><a href="${url}">Read on the site</a></p>`,
            tags: ['blog','auto'],
          };
          const resp = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers, body: JSON.stringify(payload) });
          emailed = resp.ok ? recipients.length : 0;
        }
      }
    }

    return res.json({ ok: true, id: doc._id, slug: doc.slug?.current, emailed });
  } catch (err) {
    console.error('blog/publish error', err);
    return res.status(500).json({ error: 'publish-failed' });
  }
});

// Sanity webhook: on blogPost publish, send Brevo email to a small list
app.post('/api/webhooks/sanity/blog', async (req, res) => {
  try {
    const { _type, slug, title } = req.body || {};
    if (_type !== 'blogPost') return res.status(400).json({ ok: false });
    // Fetch the full post content
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'sanity-not-configured' });
    const doc = await sc.fetch('*[_type == "blogPost" && slug.current == $slug][0]{ title, publishedAt, body }', { slug: slug?.current || slug });

    // Render a simple HTML from blocks (very basic)
    const text = JSON.stringify(doc?.body || []);
    const snippet = (text || '').slice(0, 400);

    const headers = getBrevoHeaders();
    if (!headers) return res.status(500).json({ error: 'email-not-configured' });

    const recipientsRaw = process.env.BLOG_ANNOUNCE_TO || '';
    const recipients = recipientsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (!recipients.length) return res.json({ ok: true, skipped: 'no-recipients' });

    const payload = {
      to: recipients.map((e) => ({ email: e })),
      sender: { email: process.env.SENDER_EMAIL || recipients[0], name: 'Local Effort' },
      subject: `New post: ${doc?.title || title || 'Local Effort Blog'}`,
      htmlContent: `
        <h2>${doc?.title || title || 'Local Effort Blog'}</h2>
        <p>${snippet}…</p>
        <p><a href="${(process.env.PUBLIC_URL || 'https://local-effort-app.vercel.app').replace(/\/$/, '')}/weekly/${slug?.current || slug}">Read on the site</a></p>
      `,
      tags: ['blog', 'auto'],
    };
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers, body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return res.status(502).json({ ok: false, error: 'email-failed', details: t });
    }
    return res.json({ ok: true, recipients: recipients.length });
  } catch (err) {
    console.error('sanity blog webhook error', err);
    return res.status(500).json({ error: 'webhook-failed' });
  }
});

// --- Notes (admin-backed) endpoints to support Gallant Notepad ---
// List notes (newest first)
app.get('/api/notes', requireAllowedUser, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'firestore-unavailable' });
    const snap = await db.collection('notes').orderBy('updatedAt', 'desc').limit(200).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ items });
  } catch (err) {
    console.error('notes:list error', err);
    return res.status(500).json({ error: 'notes-list-failed' });
  }
});

// Create a note
app.post('/api/notes', requireAllowedUser, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'firestore-unavailable' });
    const { title, content } = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = await db.collection('notes').add({ title: title || 'Untitled', content: content || '', createdAt: now, updatedAt: now });
    return res.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error('notes:create error', err);
    return res.status(500).json({ error: 'notes-create-failed' });
  }
});

// Update a note
app.put('/api/notes/:id', requireAllowedUser, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'firestore-unavailable' });
    const { id } = req.params;
    const { title, content } = req.body || {};
    const patch = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (typeof title === 'string') patch.title = title;
    if (typeof content === 'string') patch.content = content;
    await db.collection('notes').doc(id).update(patch);
    return res.json({ ok: true });
  } catch (err) {
    console.error('notes:update error', err);
    return res.status(500).json({ error: 'notes-update-failed' });
  }
});

// Save campaign (draft) to Sanity
app.post('/api/campaigns/save', async (req, res) => {
  try {
    const { name, html } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'Sanity not configured' });
    const doc = await sc.create({ _type: 'campaign', name, status: 'draft', html, createdAt: new Date().toISOString() });
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('campaigns/save error', err);
    return res.status(500).json({ error: 'save-failed' });
  }
});

// Team: send outbound message
app.post('/api/messages/send', async (req, res) => {
  try {
    const { to, subject, html, text, threadId, fromName, fromEmail } = req.body || {};
    if (!to || !Array.isArray(to) || to.length === 0) return res.status(400).json({ error: 'Missing recipients' });
    const headers = getBrevoHeaders();
    if (!headers) return res.status(500).json({ error: 'Email service not configured' });

    const senderEmail = fromEmail || process.env.SENDER_EMAIL;
    if (!senderEmail) return res.status(500).json({ error: 'Missing SENDER_EMAIL' });

    const payload = {
      to: to.map((e) => ({ email: e })),
      sender: { email: senderEmail, name: fromName || 'Local Effort' },
      subject: subject || '(no subject)',
      htmlContent: html || undefined,
      textContent: text || undefined,
      tags: ['outbound'],
      headers: threadId ? { 'X-Thread-Id': String(threadId) } : undefined,
    };
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return res.status(502).json({ error: 'send-failed', details: t });
    }

    // Mirror into Sanity
    const sc = getSanityClient();
    let msgDoc = null;
    if (sc) {
      try {
        msgDoc = await sc.create({
          _type: 'message',
          direction: 'outbound',
          status: 'sent',
          subject: subject || '(no subject)',
          bodyHtml: html || null,
          bodyText: text || null,
          toEmails: to,
          channel: 'email',
          inbox: 'general',
          threadId: threadId || null,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Failed to mirror outbound message:', e && e.message);
      }
    }
    return res.json({ ok: true, id: msgDoc?._id || null });
  } catch (err) {
    console.error('messages/send error', err);
    return res.status(500).json({ error: 'send-failed' });
  }
});

// Team: read inbox (basic, newest first)
app.get('/api/inbox', async (req, res) => {
  try {
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'Sanity not configured' });
    const { status = 'open', limit = '50' } = req.query || {};
    const lim = Math.min(200, parseInt(limit, 10) || 50);
    const query = `*[_type == "message" && status == $status] | order(createdAt desc)[0...$lim]{
      _id, direction, subject, fromEmail, fromName, toEmails, createdAt, inbox, status
    }`;
    const docs = await sc.fetch(query, { status, lim });
    return res.json({ items: docs });
  } catch (err) {
    console.error('inbox error', err);
    return res.status(500).json({ error: 'inbox-failed' });
  }
});

// --- Push subscriptions (Web Push) ---
let webPush = null;
try {
  webPush = require('web-push');
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_SUBJECT || 'mailto:admin@localhost';
  if (pub && priv) webPush.setVapidDetails(email, pub, priv);
} catch (e) {
  console.warn('web-push not available:', e && e.message);
}

app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { userId, subscription } = req.body || {};
    if (!subscription) return res.status(400).json({ error: 'Missing subscription' });
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'Sanity not configured' });
    const doc = await sc.create({
      _type: 'pushSubscription',
      userId: userId || null,
      endpoint: subscription.endpoint,
      keys: subscription.keys || null,
      createdAt: new Date().toISOString(),
    });
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('push subscribe error', err);
    return res.status(500).json({ error: 'subscribe-failed' });
  }
});

app.post('/api/push/notify', async (req, res) => {
  try {
    if (!webPush) return res.status(500).json({ error: 'web-push not configured' });
    const { title, body, url = '/' } = req.body || {};
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ error: 'Sanity not configured' });
    const subs = await sc.fetch('*[_type == "pushSubscription"]').catch(() => []);
    const payload = JSON.stringify({ title: title || 'Local Effort', body: body || '', url });
    const results = [];
    for (const s of subs) {
      try {
        // minimal shape for webpush
        const sub = { endpoint: s.endpoint, keys: s.keys };
        // eslint-disable-next-line no-await-in-loop
        await webPush.sendNotification(sub, payload);
        results.push({ id: s._id, ok: true });
      } catch (e) {
        results.push({ id: s._id, ok: false, error: String(e).slice(0, 120) });
      }
    }
    return res.json({ ok: true, sent: results.length, results });
  } catch (err) {
    console.error('push notify error', err);
    return res.status(500).json({ error: 'notify-failed' });
  }
});

// --- Public, machine-readable JSON endpoints ---
// Lightweight, JS-free data for crawlers/LLMs and integrations.
app.get('/api/public/site', (req, res) => {
  try {
    const url = process.env.PUBLIC_URL || 'https://local-effort-app.vercel.app/';
    const routes = [
      '/',
      '/#/services',
      '/#/pricing',
      '/#/menu',
      '/#/about',
      '/#/gallery',
      '/#/crowdfunding',
    ];
    const endpoints = [
      { path: '/api/support/search', method: 'GET', query: 'q' },
      { path: '/api/messages/submit', method: 'POST' },
      { path: '/api/subscribe', method: 'POST' },
      { path: '/api/public/pricing-faq', method: 'GET' },
      { path: '/api/public/estimator-help', method: 'GET' },
    ];
    return res.json({
      name: 'Local Effort',
      url,
      routes,
      endpoints,
      sitemap: url.replace(/\/$/, '') + '/sitemap.xml',
      aiTxt: url.replace(/\/$/, '') + '/ai.txt',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('public/site error', err);
    return res.status(500).json({ error: 'public-site-failed' });
  }
});

function readJsonFileSafe(filePath, fallback = []) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

app.get('/api/public/pricing-faq', (req, res) => {
  try {
    const file = path.resolve(__dirname, '../../src/data/pricingFaq.json');
    const items = readJsonFileSafe(file, []);
    let updatedAt = null;
    try {
      const st = fs.statSync(file);
      updatedAt = st.mtime.toISOString();
    } catch (e) {
      updatedAt = null;
    }
    return res.json({ items, updatedAt });
  } catch (err) {
    console.error('public/pricing-faq error', err);
    return res.status(500).json({ error: 'public-pricing-faq-failed' });
  }
});

app.get('/api/public/estimator-help', (req, res) => {
  try {
    const file = path.resolve(__dirname, '../../src/data/estimatorHelp.json');
    const items = readJsonFileSafe(file, []);
    let updatedAt = null;
    try {
      const st = fs.statSync(file);
      updatedAt = st.mtime.toISOString();
    } catch (e) {
      updatedAt = null;
    }
    return res.json({ items, updatedAt });
  } catch (err) {
    console.error('public/estimator-help error', err);
    return res.status(500).json({ error: 'public-estimator-help-failed' });
  }
});

// --- Referral: validate a code (Sanity-backed) ---
app.post('/api/referrals/validate', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ ok: false, error: 'missing-code' });
    }
    const sc = getSanityClient();
    if (!sc) return res.status(500).json({ ok: false, error: 'sanity-not-configured' });
    const trimmed = code.trim();
    const doc = await sc.fetch('*[_type == "referralParticipant" && code == $code][0]{ _id, name, email, code }', { code: trimmed }).catch(() => null);
    if (!doc) return res.json({ ok: false, valid: false });
    return res.json({ ok: true, valid: true, participant: { id: doc._id, name: doc.name || null, email: doc.email || null, code: doc.code } });
  } catch (err) {
    console.error('referrals/validate error', err);
    return res.status(500).json({ ok: false, error: 'validate-failed' });
  }
});

// --- Square Customers: list and import ---
// List Square customers (minimal fields) with pagination cursor support
app.get('/api/square/customers', async (req, res) => {
  try {
    if (!squareClient) return res.status(500).json({ error: 'square-not-configured' });
    const { cursor } = req.query || {};
    const result = await squareClient.customersApi.listCustomers(cursor ? { cursor } : undefined);
    const customers = (result.result.customers || []).map((c) => ({
      id: c.id,
      givenName: c.givenName,
      familyName: c.familyName,
      email: c.emailAddress,
      phone: c.phoneNumber,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return res.json({ items: customers, cursor: result.result.cursor || null });
  } catch (err) {
    console.error('square/customers list error:', err && err.message);
    return res.status(500).json({ error: 'square-list-failed' });
  }
});

async function mirrorContactInSanity({ email, firstName, lastName, phone, tags }) {
  const sc = getSanityClient();
  if (!sc) return null;
  const now = new Date().toISOString();
  const hasEmail = !!email;
  const id = hasEmail ? `contact-${email}` : undefined;
  try {
    if (id) {
      // Upsert by deterministic id when email exists
      return await sc.createOrReplace({
        _id: id,
        _type: 'contact',
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        tags: Array.isArray(tags) && tags.length ? tags : ['square'],
        updatedAt: now,
      });
    }
    // No email: create new document with generated id
    return await sc.create({
      _type: 'contact',
      email: null,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
      tags: Array.isArray(tags) && tags.length ? tags : ['square'],
      updatedAt: now,
    });
  } catch (e) {
    console.warn('Failed to mirror contact in Sanity:', e && e.message);
    return null;
  }
}

// Import Square customers into Sanity contacts (and optionally Brevo)
// POST body: { cursor?, limit?, upsertBrevo?: boolean }
app.post('/api/square/customers/import', async (req, res) => {
  try {
    if (!squareClient) return res.status(500).json({ error: 'square-not-configured' });
    const { cursor, upsertBrevo = false } = req.body || {};
    const out = { imported: 0, skipped: 0, errors: 0, cursor: null };
    // Pull one page to keep request sizes modest; clients can call repeatedly with cursor
    const result = await squareClient.customersApi.listCustomers(cursor ? { cursor } : undefined);
    const list = result.result.customers || [];
    out.cursor = result.result.cursor || null;
    for (const c of list) {
      try {
        const email = c.emailAddress || null;
        const firstName = c.givenName || null;
        const lastName = c.familyName || null;
        const phone = c.phoneNumber || null;
        // Mirror to Sanity
        await mirrorContactInSanity({ email, firstName, lastName, phone, tags: ['square'] });
        // Optional: upsert to Brevo contacts
        if (upsertBrevo && email) {
          try {
            await upsertContact({ email, firstName, lastName, phone });
          } catch (e) {
            console.warn('Brevo upsert failed:', e && e.message);
          }
        }
        out.imported += 1;
      } catch (e) {
        out.errors += 1;
      }
    }
    return res.json(out);
  } catch (err) {
    console.error('square/customers import error:', err && err.message);
    return res.status(500).json({ error: 'square-import-failed' });
  }
});


// Start server when run directly
const PORT = process.env.PORT || 3001;
if (require.main === module) {
  if (!db) console.warn('Firestore not initialized — some endpoints will fail without FIREBASE_SERVICE_ACCOUNT_JSON');
  app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;