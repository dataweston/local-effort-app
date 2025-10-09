require('dotenv').config();

console.log('Testing Square client initialization...');
console.log('SQUARE_ENVIRONMENT:', process.env.SQUARE_ENVIRONMENT);
console.log('SQUARE_ACCESS_TOKEN exists:', !!process.env.SQUARE_ACCESS_TOKEN);

let Client, Environment;
try {
  const squarePkg = require('square');
  Client = squarePkg.Client || (squarePkg.default && squarePkg.default.Client);
  Environment = squarePkg.Environment || (squarePkg.default && squarePkg.default.Environment) || null;
  console.log('Square SDK loaded successfully');
} catch (err) {
  console.warn('Square SDK not available or failed to load:', err && err.message);
  process.exit(1);
}

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

  try {
    squareClient = new Client({
      environment: resolvedEnv,
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
    });
    console.log('Square client initialized successfully');
    console.log('Environment used:', envName);
  } catch (error) {
    console.log('Failed to create Square client:', error.message);
  }
} else {
  console.warn('Square Client not available');
}