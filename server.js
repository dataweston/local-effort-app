const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cloudinary = require('cloudinary');
const logger = require('./logger');
const crowdfundCheckoutHandler = require('./api/crowdfund/checkout');
// Sentry (backend light server)
let Sentry;
try {
  Sentry = require('@sentry/node');
  const { nodeProfilingIntegration } = require('@sentry/profiling-node');
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE || 0.0),
    });
  }
} catch (e) {
  // Sentry not installed yet; ignore
}

const app = express();

// Parse JSON bodies for API routes
app.use(express.json({ limit: '2mb' }));

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Add CORS headers for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Basic request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({ method: req.method, url: req.originalUrl, status: res.statusCode, ms: Date.now() - start }, 'req');
  });
  next();
});

// The API route with better error handling
app.get('/api/search-images', async (req, res) => {
  logger.debug({ q: req.query.query }, 'search-images called');

  try {
    // Test Cloudinary connection first
    const testResult = await cloudinary.v2.api.ping();
  logger.debug({ ping: testResult.status }, 'cloudinary ping ok');
    
    const searchQuery = req.query.query || '';
  logger.debug({ searchQuery }, 'cloudinary searching');
    
    // If no query, search for all images
    const searchExpression = searchQuery || 'resource_type:image';
    
    const result = await cloudinary.v2.search
      .expression(searchExpression)
      .sort_by('created_at', 'desc')
      .with_field('context')
      .max_results(30)
      .execute();

    logger.info({ total_count: result.total_count, resources_count: result.resources?.length }, 'search result');

    res.json({ 
      images: result.resources,
      total_count: result.total_count 
    });
  } catch (error) {
  logger.error({ err: error }, 'search-images failed');
    if (Sentry && process.env.SENTRY_DSN) Sentry.captureException(error);
    res.status(500).json({ 
      error: 'Failed to fetch images',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Crowdfund checkout proxy for local development
app.all('/api/crowdfund/checkout', async (req, res, next) => {
  try {
    await crowdfundCheckoutHandler(req, res);
  } catch (err) {
    logger.error({ err, method: req.method }, 'crowdfund checkout handler failed');
    next(err);
  }
});

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'web server listening');
    logger.info({
      cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
      api_key: !!process.env.CLOUDINARY_API_KEY,
      api_secret: !!process.env.CLOUDINARY_API_SECRET
    }, 'cloudinary config flags');
  });
}

// Export for Vercel
module.exports = app;