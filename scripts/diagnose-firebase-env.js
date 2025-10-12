// Diagnostic for FIREBASE_SERVICE_ACCOUNT_BASE64
// - loads .env if present (via dotenv)
// - attempts to decode and parse the base64 value
// - prints safe diagnostics (no private key content)

try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed; continue
}

const safePrint = (label, value) => {
  console.log(`${label}: ${value}`);
};

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!raw) {
  safePrint('FOUND', 'no');
  process.exit(0);
}

const trimmed = raw.trim();
const hasSurroundingQuotes = /^['"]/.test(trimmed) && /['"]$/.test(trimmed);
if (hasSurroundingQuotes) {
  safePrint('FOUND', 'yes (wrapped in quotes)');
} else {
  safePrint('FOUND', 'yes');
}

// try stripping surrounding quotes
const cleaned = hasSurroundingQuotes ? trimmed.slice(1, -1) : trimmed;

// try decode
let decoded = null;
try {
  decoded = Buffer.from(cleaned, 'base64').toString('utf8');
  safePrint('DECODE_OK', decoded.length ? 'yes' : 'empty');
} catch (err) {
  safePrint('DECODE_OK', 'no');
  safePrint('DECODE_ERROR', String(err.message || err));
}

if (!decoded) process.exit(0);

// try parse
let parsed = null;
try {
  parsed = JSON.parse(decoded);
  const hasProjectId = !!(parsed.project_id || parsed.projectId || process.env.FIREBASE_PROJECT_ID);
  const hasClientEmail = !!(parsed.client_email || parsed.clientEmail || process.env.FIREBASE_CLIENT_EMAIL);
  const hasPrivateKey = !!(parsed.private_key || parsed.privateKey || process.env.FIREBASE_PRIVATE_KEY);
  safePrint('PARSE_OK', 'yes');
  safePrint('hasProjectId', String(hasProjectId));
  safePrint('hasClientEmail', String(hasClientEmail));
  safePrint('hasPrivateKey', String(hasPrivateKey));
  if (parsed.private_key) {
    safePrint('private_key_startsWith_BEGIN', String(parsed.private_key.indexOf('-----BEGIN') === 0));
    safePrint('private_key_length', String(parsed.private_key.length));
  }
} catch (err) {
  safePrint('PARSE_OK', 'no');
  safePrint('PARSE_ERROR', String(err.message || err));
}

process.exit(0);
