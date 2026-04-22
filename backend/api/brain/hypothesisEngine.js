/**
 * Hypothesis evaluation engine.
 *
 * Evaluates all active Hypothesis entities nightly. Each hypothesis has a
 * machine-checkable predicate in its properties JSON. This engine runs the
 * SQL check, updates the hypothesis status + confidence, writes a
 * VALIDATES_HYPOTHESIS inference, and surfaces status changes to the inbox.
 *
 * Supported predicate conditions (condition / prediction fields):
 *   orderCount(window_days)    — count of payment.completed ledger events for entity
 *   spendTotal(window_days)    — sum of payment amounts in cents
 *   vendorCount(window_days)   — distinct vendor entities paid
 *   feedbackRating(dish)       — average numeric rating (love=4, like=3, ok=2, dislike=1)
 *   daysSinceLastOrder         — days since last payment.completed for entity
 */

const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent, createInboxItem } = require('./ledger');

const RATING_SCORES = { love: 4, like: 3, ok: 2, dislike: 1 };

// ── Predicate evaluators ──────────────────────────────────────────────────────

async function evalOrderCount(prisma, entityId, windowDays) {
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const count = await prisma.ledgerEvent.count({
    where: {
      eventType: 'payment.completed',
      tombstonedAt: null,
      occurredAt: { gte: since },
      payload: { path: ['vendorEntityId'], equals: entityId },
    },
  });
  return count;
}

async function evalSpendTotal(prisma, entityId, windowDays) {
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: 'payment.completed',
      tombstonedAt: null,
      occurredAt: { gte: since },
      payload: { path: ['vendorEntityId'], equals: entityId },
    },
    select: { payload: true },
  });
  return events.reduce((sum, e) => sum + (e.payload?.amountCents || 0), 0);
}

async function evalVendorCount(prisma, windowDays) {
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: 'payment.completed',
      tombstonedAt: null,
      occurredAt: { gte: since },
    },
    select: { payload: true },
  });
  const vendors = new Set(events.map(e => e.payload?.vendorEntityId).filter(Boolean));
  return vendors.size;
}

async function evalFeedbackRating(prisma, dishName, windowDays) {
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: 'menu.feedback',
      tombstonedAt: null,
      occurredAt: { gte: since },
      payload: { path: ['dishName'], string_contains: dishName },
    },
    select: { payload: true },
  });
  if (!events.length) return null;
  const scores = events.map(e => RATING_SCORES[e.payload?.rating] || 0).filter(Boolean);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

async function evalDaysSinceLastOrder(prisma, entityId) {
  const last = await prisma.ledgerEvent.findFirst({
    where: {
      eventType: 'payment.completed',
      tombstonedAt: null,
      payload: { path: ['vendorEntityId'], equals: entityId },
    },
    orderBy: { occurredAt: 'desc' },
    select: { occurredAt: true },
  });
  if (!last) return null;
  return Math.floor((Date.now() - new Date(last.occurredAt).getTime()) / 86_400_000);
}

// ── Condition parser ──────────────────────────────────────────────────────────

// Parses "orderCount(first_30_days) >= 2" → { fn, args, op, value }
function parseCondition(expr) {
  const match = expr.match(/^(\w+)\(([^)]*)\)\s*(>=|<=|>|<|==|!=)\s*(.+)$/);
  if (!match) return null;
  const [, fn, rawArgs, op, rawValue] = match;
  const args = rawArgs.split(',').map(a => a.trim());
  const value = parseFloat(rawValue.trim());
  return { fn, args, op, value };
}

function compare(actual, op, expected) {
  if (actual === null || actual === undefined) return false;
  switch (op) {
    case '>=': return actual >= expected;
    case '<=': return actual <= expected;
    case '>':  return actual > expected;
    case '<':  return actual < expected;
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    default:   return false;
  }
}

async function evalCondition(prisma, condExpr, hypothesis) {
  const parsed = parseCondition(condExpr);
  if (!parsed) return { result: null, actual: null, error: `unparseable: ${condExpr}` };

  const { fn, args, op, value } = parsed;
  const entityId = hypothesis.properties?.subjectEntityId || null;

  let actual = null;

  try {
    if (fn === 'orderCount') {
      // args: "first_30_days" → extract number, or just a plain number like "90"
      const days = parseInt(args[0].replace(/\D/g, '')) || 30;
      actual = await evalOrderCount(prisma, entityId, days);
    } else if (fn === 'spendTotal') {
      const days = parseInt(args[0].replace(/\D/g, '')) || 90;
      actual = await evalSpendTotal(prisma, entityId, days);
    } else if (fn === 'vendorCount') {
      const days = parseInt(args[0].replace(/\D/g, '')) || 90;
      actual = await evalVendorCount(prisma, days);
    } else if (fn === 'feedbackRating') {
      const dish = args[0] || '';
      const days = parseInt(args[1] || '30');
      actual = await evalFeedbackRating(prisma, dish, days);
    } else if (fn === 'daysSinceLastOrder') {
      actual = await evalDaysSinceLastOrder(prisma, entityId);
    } else {
      return { result: null, actual: null, error: `unknown fn: ${fn}` };
    }
  } catch (err) {
    return { result: null, actual: null, error: err.message };
  }

  return { result: compare(actual, op, value), actual, error: null };
}

// ── Main evaluation pass ──────────────────────────────────────────────────────

async function runHypothesisPass({ logger } = {}) {
  const prisma = getPrisma();

  const hypotheses = await prisma.brainEntity.findMany({
    where: { entityType: 'Hypothesis', tombstonedAt: null, status: { not: 'archived' } },
  });

  logger?.info({ count: hypotheses.length }, 'brain/hypothesis: evaluating');

  let evaluated = 0, statusChanges = 0, errors = 0;

  for (const hypo of hypotheses) {
    const props = hypo.properties || {};
    const predicate = props.predicate;
    if (!predicate?.condition || !predicate?.prediction) continue;

    try {
      // Evaluate both condition and prediction independently
      const [condResult, predResult] = await Promise.all([
        evalCondition(prisma, predicate.condition, hypo),
        evalCondition(prisma, predicate.prediction, hypo),
      ]);

      const sampleSize = (props.sampleSize || 0) + 1;
      const condMet = condResult.result === true;
      const predMet = predResult.result === true;

      // Only count toward hypothesis if the condition (subject) was met
      const confirmedCount = (props.confirmedCount || 0) + (condMet && predMet ? 1 : 0);
      const rejectedCount  = (props.rejectedCount  || 0) + (condMet && !predMet ? 1 : 0);

      const minSample = predicate.minSampleSize || 3;
      const confidence = sampleSize >= minSample
        ? confirmedCount / Math.max(confirmedCount + rejectedCount, 1)
        : null;

      // Determine new status
      let newStatus = props.status || 'collecting';
      if (sampleSize >= minSample && confidence !== null) {
        if (confidence >= 0.75) newStatus = 'confirmed';
        else if (confidence <= 0.25) newStatus = 'rejected';
        else newStatus = 'inconclusive';
      }

      const prevStatus = props.status || 'collecting';
      const statusChanged = newStatus !== prevStatus;

      // Update hypothesis entity
      await prisma.brainEntity.update({
        where: { id: hypo.id },
        data: {
          properties: {
            ...props,
            status: newStatus,
            confidence: confidence ?? props.confidence ?? null,
            sampleSize,
            confirmedCount,
            rejectedCount,
            lastEvaluatedAt: new Date().toISOString(),
            lastConditionActual: condResult.actual,
            lastPredictionActual: predResult.actual,
          },
        },
      });

      // Write VALIDATES_HYPOTHESIS inference
      const prevInference = await prisma.brainInference.findFirst({
        where: { srcId: hypo.id, inferenceType: 'VALIDATES_HYPOTHESIS', knownUntil: null, supersededBy: null },
      });

      const inferenceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await prisma.brainInference.create({
        data: {
          srcId: hypo.id,
          dstId: hypo.id,
          inferenceType: 'VALIDATES_HYPOTHESIS',
          confidence: confidence ?? 0,
          decayRate: 'none',
          knownFrom: new Date(),
          computedAt: new Date(),
          computedFrom: [],
          summary: `${hypo.name}: ${newStatus} (${confirmedCount}/${sampleSize} confirm, conf=${confidence?.toFixed(2) ?? 'n/a'})`,
          staleAt: new Date(Date.now() + 7 * 86_400_000),
        },
      });

      // Supersede the previous inference
      if (prevInference) {
        await prisma.brainInference.update({
          where: { id: prevInference.id },
          data: { knownUntil: new Date(), supersededBy: inferenceId },
        });
      }

      // Surface status changes to inbox
      if (statusChanged && newStatus !== 'collecting') {
        const emoji = newStatus === 'confirmed' ? '✓' : newStatus === 'rejected' ? '✗' : '~';
        await createInboxItem({
          rawContent: `Hypothesis ${emoji} ${newStatus.toUpperCase()}: "${hypo.name}" — ${confirmedCount}/${sampleSize} data points confirm (confidence ${confidence?.toFixed(2) ?? 'n/a'}). Predicate: ${predicate.condition} → ${predicate.prediction}`,
          source: 'hypothesis_engine',
        });
        statusChanges++;
      }

      evaluated++;
      logger?.info({ id: hypo.id, name: hypo.name, newStatus, confidence }, 'brain/hypothesis: evaluated');
    } catch (err) {
      errors++;
      logger?.error({ err, id: hypo.id }, 'brain/hypothesis: eval error');
    }
  }

  return { evaluated, statusChanges, errors };
}

module.exports = { runHypothesisPass };
