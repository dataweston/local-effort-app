/**
 * Hub dish resolution — match free-text dish names to canonical brain `Dish`
 * entities so the kitchen's loose notes become structured, groupable menu rows.
 *
 * Used by the Food Inputs / master-menu UI to turn a note line ("nicoise lunch")
 * into a confident link to a knowledge-graph Dish, or to surface candidates when
 * the match is ambiguous. Staff-only; this reads the company brain.
 *
 *   POST /api/hub/resolve-dish
 *     body: { name: string }                  → { ok, result }
 *     body: { names: string[] }               → { ok, results: [...] }
 *
 * Each result: { query, resolved, dishEntityId, confidence, method, name, candidates }
 */

const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed } = require('./_http');
const { resolveDishName, resolveDishNames } = require('../../backend/api/brain/dishResolver');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const MAX_BATCH = 60;

async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  // Resolution reads the company brain — staff/privileged only.
  const denied = requireHubAccess(auth, { allowedAccess: ['staff', 'privileged'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    const body = req.body || {};
    if (Array.isArray(body.names)) {
      const names = body.names.slice(0, MAX_BATCH);
      const results = await resolveDishNames(names, { prisma });
      return res.status(200).json({ ok: true, results });
    }
    if (typeof body.name === 'string') {
      const result = await resolveDishName(body.name, { prisma });
      return res.status(200).json({ ok: true, result });
    }
    return res.status(400).json({ error: 'Provide `name` (string) or `names` (string[])' });
  } catch (err) {
    console.error('[hub/resolve-dish] error', err);
    return res.status(500).json({ error: 'Unable to resolve dish' });
  }
}

module.exports = handler;
