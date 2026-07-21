const path = require('path');
const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed } = require('./_http');
const { buildLineModel } = require('../../skills/le-economist/scripts/build-line-model.cjs');

const MODEL_KEYS = new Set([
  'monthlyOrders',
  'averageRevenuePerOrder',
  'ingredientCostPerOrder',
  'paidLaborHoursPerOrder',
  'paidLaborHourlyRate',
  'founderLaborHoursPerOrder',
  'founderLaborHourlyRate',
  'kitchenHoursPerOrder',
  'packagingDeliveryPerOrder',
  'otherVariableCostPerOrder',
  'monthlyOrderCapacity',
]);

function previousMonthEnd() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).toISOString().slice(0, 10);
}

function validIsoDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function cleanScenarioInputs(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((raw) => {
    const line = { id: String(raw?.id || '').slice(0, 80) };
    for (const key of MODEL_KEYS) {
      if (raw?.[key] === null || raw?.[key] === '') {
        line[key] = null;
        continue;
      }
      const number = Number(raw?.[key]);
      if (Number.isFinite(number) && number >= 0 && number <= 100_000_000) line[key] = number;
    }
    return line;
  }).filter((line) => line.id);
}

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { privileged: true });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const input = req.method === 'POST' ? req.body || {} : req.query || {};
  const start = String(input.start || '2026-04-01');
  const end = String(input.end || previousMonthEnd());
  if (!validIsoDay(start) || !validIsoDay(end)) {
    return res.status(400).json({ error: 'start and end must use YYYY-MM-DD' });
  }
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  const days = (endDate - startDate) / 86400000;
  if (days < 0 || days > 731) return res.status(400).json({ error: 'Model period must be between 1 day and 24 months' });

  try {
    const model = await buildLineModel({
      repo: path.resolve(__dirname, '../..'),
      start,
      end,
      scenarioInputs: cleanScenarioInputs(input.scenarioInputs),
    });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ ok: true, model });
  } catch (err) {
    const code = String(err?.code || 'ECONOMICS_MODEL_UNAVAILABLE');
    console.error('[hub/economics-model] error', {
      code,
      message: err?.message,
      causeCode: err?.cause?.code,
      causeMessage: err?.cause?.message,
    });
    return res.status(503).json({
      error: 'Unable to build the economics model from current sources',
      code,
    });
  }
};
