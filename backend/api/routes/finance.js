/**
 * Finance Core operational routes: projections and payment reconciliation.
 *
 * These write commercial evidence from systems this repo does not own the
 * write path for (Happy Monday's portal, Localist's roster) and repair payment
 * records the live handlers could not finish. All of them are admin/cron only
 * and all are idempotent, so a re-run after a failure is always safe.
 */

const crypto = require('crypto');
const express = require('express');

const { prisma } = require('../utils/prisma');
const { getSupabase } = require('../supabaseClient');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { runHappyMondayProjection } = require('../finance/happyMondayProjection');
const { runLocalistProjection } = require('../finance/localistProjection');
const { runSmallEventsProjection } = require('../finance/smallEventsProjection');
const { reconcilePendingAttempts } = require('../finance/squarePaymentEvidence');

const verifyAdminRequest = createAdminVerifier();

function timingSafeEqual(provided, expected) {
  const a = String(provided || '');
  const b = String(expected || '');
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function hasAdminKeyHeader(req) {
  return timingSafeEqual(req.headers['x-brain-admin-key'], process.env.BRAIN_ADMIN_KEY);
}

function isCronRequest(req) {
  return req.headers['x-vercel-cron'] === '1'
    || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
}

async function authorize(req, res) {
  const admin = await verifyAdminRequest(req);
  if (admin || isCronRequest(req) || hasAdminKeyHeader(req)) return true;
  res.status(403).json({ error: 'admin only' });
  return false;
}

function readDryRun(req) {
  return String(req.body?.dryRun ?? req.query?.dryRun) === 'true';
}

function createFinanceRouter({ logger = null } = {}) {
  const router = express.Router();

  const guarded = (handler) => async (req, res) => {
    if (!(await authorize(req, res))) return undefined;
    if (!prisma) return res.status(503).json({ error: 'database unavailable' });
    try {
      return await handler(req, res);
    } catch (error) {
      logger?.error?.({ err: error, path: req.path }, 'finance route failed');
      return res.status(500).json({ error: error?.message || 'internal-error' });
    }
  };

  // Project the Happy Monday portal roster into agreement/order/invoice records
  // and apply its payments to those invoices, oldest first.
  const happyMonday = guarded(async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'supabase unavailable' });
    const summary = await runHappyMondayProjection({
      prisma,
      supabase,
      dryRun: readDryRun(req),
      logger,
    });
    return res.json({ ok: true, ...summary });
  });
  router.post('/happy-monday/project', happyMonday);
  router.get('/happy-monday/project', happyMonday);

  // Project the Localist roster into provider-neutral membership agreements,
  // subscriptions, and dues invoices. Dues never mix with food orders.
  const localist = guarded(async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'supabase unavailable' });
    const summary = await runLocalistProjection({
      prisma,
      supabase,
      dryRun: readDryRun(req),
      logger,
    });
    return res.json({ ok: true, ...summary });
  });
  router.post('/localist/project', localist);
  router.get('/localist/project', localist);

  // Project small-event estimates, deposits, and balances into commercial
  // orders, invoices, and allocations.
  const smallEvents = guarded(async (req, res) => {
    const summary = await runSmallEventsProjection({ prisma, dryRun: readDryRun(req), logger });
    return res.json({ ok: true, ...summary });
  });
  router.post('/small-events/project', smallEvents);
  router.get('/small-events/project', smallEvents);

  // Close out attempts left pending by a crash between capture and commit, and
  // report captures that no attempt claims.
  const reconcile = guarded(async (req, res) => {
    const hours = Number(req.body?.hours ?? req.query?.hours);
    const summary = await reconcilePendingAttempts({
      prisma,
      lookbackHours: Number.isFinite(hours) ? Math.min(Math.max(hours, 1), 24 * 90) : 72,
      dryRun: readDryRun(req),
      logger,
    });
    return res.json({ ok: true, ...summary });
  });
  router.post('/reconcile-payments', reconcile);
  router.get('/reconcile-payments', reconcile);

  return router;
}

module.exports = { createFinanceRouter };
