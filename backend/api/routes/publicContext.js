const express = require('express');
const {
  buildPublicCollectionPayload,
  buildPublicSitePayload,
  loadManifest,
  resolveDefaultPaths,
} = require('../services/publicContext');

function createPublicContextRouter({
  logger,
  manifestPath,
  pricingFaqPath,
  estimatorHelpPath,
  fs,
  env,
  now,
} = {}) {
  const router = express.Router();
  const defaults = resolveDefaultPaths();
  const resolvedManifestPath = manifestPath || defaults.manifestPath;
  const resolvedPricingFaqPath = pricingFaqPath || defaults.pricingFaqPath;
  const resolvedEstimatorHelpPath = estimatorHelpPath || defaults.estimatorHelpPath;

  router.get('/public/site', (req, res) => {
    try {
      const manifest = loadManifest(resolvedManifestPath, { fsImpl: fs, logger });
      return res.json(buildPublicSitePayload({ manifest, env, now }));
    } catch (err) {
      logger?.error?.({ err }, 'public site error');
      return res.status(500).json({ error: 'public-site-failed' });
    }
  });

  router.get('/public/pricing-faq', (req, res) => {
    try {
      return res.json(buildPublicCollectionPayload(resolvedPricingFaqPath, { fsImpl: fs }));
    } catch (err) {
      logger?.error?.({ err }, 'public pricing faq error');
      return res.status(500).json({ error: 'public-pricing-faq-failed' });
    }
  });

  router.get('/public/estimator-help', (req, res) => {
    try {
      return res.json(buildPublicCollectionPayload(resolvedEstimatorHelpPath, { fsImpl: fs }));
    } catch (err) {
      logger?.error?.({ err }, 'public estimator help error');
      return res.status(500).json({ error: 'public-estimator-help-failed' });
    }
  });

  return router;
}

module.exports = { createPublicContextRouter };
