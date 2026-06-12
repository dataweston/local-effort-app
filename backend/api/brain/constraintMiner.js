/**
 * Dietary constraint miner.
 *
 * Reads `intake.meal_prep.submitted` ledger events and turns the customer's
 * own form answers (allergies, dislikes, dietary notes, protein preferences)
 * into constraint assertions on their Customer entity, in exactly the shape
 * menu broadcast checking reads (menuRoutes.checkConstraints):
 *
 *   Customer --AVOIDS-->             Ingredient/Constraint  (metadata.severity 'avoid')
 *   Customer --MEDICAL_CONSTRAINT--> Ingredient/Constraint  (metadata.severity 'medical')
 *   Customer --PREFERS-->            Ingredient             (metadata.severity 'preference')
 *
 * These are written confirmed (not provisional): the source is the customer's
 * direct intake form, the LLM only normalizes phrasing. Idempotent — events
 * that already produced constraint assertions are skipped.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent, findOrCreateEntity } = require('./ledger');

const MODEL = process.env.BRAIN_TRIAGE_MODEL || 'claude-opus-4-8';
const CONSTRAINT_REL_TYPES = ['AVOIDS', 'PREFERS', 'MEDICAL_CONSTRAINT'];

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    constraints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string', description: 'Short canonical food/ingredient/diet name, lowercase, singular — e.g. "cilantro", "shellfish", "gluten", "vegetarian"' },
          kind: { type: 'string', enum: ['ingredient', 'diet'], description: 'ingredient = a specific food; diet = a dietary pattern like vegetarian/halal/low-sodium' },
          direction: { type: 'string', enum: ['avoids', 'prefers'] },
          severity: { type: 'string', enum: ['medical', 'avoid', 'preference'], description: 'medical = allergy/intolerance/health-mandated; avoid = strong dislike or firm rule; preference = soft like/dislike' },
          evidence: { type: 'string', description: 'The exact form text this came from' },
        },
        required: ['item', 'kind', 'direction', 'severity', 'evidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['constraints'],
  additionalProperties: false,
};

let anthropicClient = null;
function getAnthropic() {
  if (!anthropicClient) anthropicClient = new Anthropic();
  return anthropicClient;
}

function intakeConstraintText(answers = {}) {
  const fields = [
    ['Allergies', answers.allergies],
    ['Dislikes', answers.dislikes],
    ['Dietary notes', answers.dietary_notes],
    ['Nutritional goals', answers.nutritional_goals],
    ['Specific needs', answers.specific_needs_to_detail],
    ['Proteins selected', answers.proteins_selected],
    ['Proteins everyday', answers.proteins_everyday],
    ['Spice/heat tolerance', answers.spice_heat_tolerance],
  ];
  return fields
    .filter(([, v]) => v != null && String(Array.isArray(v) ? v.join(', ') : v).trim().length > 0)
    .map(([label, v]) => `${label}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');
}

async function extractConstraints(text) {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Extract dietary constraints from this meal-prep intake form for a Minneapolis meal-subscription business.

RULES:
- Allergies and intolerances -> direction "avoids", severity "medical".
- Firm dislikes / "no X ever" -> direction "avoids", severity "avoid".
- Mild dislikes -> direction "avoids", severity "preference".
- Protein selections and stated likes -> direction "prefers", severity "preference".
- Dietary patterns (vegetarian, pescatarian, halal, low-sodium...) -> kind "diet".
- One constraint per distinct item; split lists ("no cilantro or shrimp" -> two constraints).
- Do not invent constraints. Spice tolerance is only a constraint if it forbids something ("no spicy food" -> avoids "spicy food", severity avoid).
- If there is nothing constraint-like, return an empty list.

FORM ANSWERS:
${text}`,
    }],
    output_config: { format: { type: 'json_schema', schema: EXTRACTION_SCHEMA } },
  });
  const out = response.content.find((b) => b.type === 'text')?.text;
  if (!out) return [];
  return JSON.parse(out).constraints || [];
}

// Deterministic fallback — used when the Anthropic API is unavailable (no key
// or no credits). Handles the structured list fields; free-text dietary notes
// need the LLM pass and are left for a later force re-mine.
const NOISE_ITEMS = new Set(['none', 'n/a', 'na', 'no', 'nothing', 'nope', '-', 'n.a.']);

function splitItems(value) {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '');
  return raw
    .split(/[,;\n]|\band\b|\bor\b|\//i)
    .map((s) => s.replace(/[.!]+$/, '').trim().toLowerCase())
    .filter((s) => s.length >= 2 && s.length <= 40 && !NOISE_ITEMS.has(s));
}

function deterministicConstraints(answers = {}) {
  const constraints = [];
  for (const item of splitItems(answers.allergies)) {
    constraints.push({ item, kind: 'ingredient', direction: 'avoids', severity: 'medical', evidence: `Allergies: ${item}` });
  }
  for (const item of splitItems(answers.dislikes)) {
    constraints.push({ item, kind: 'ingredient', direction: 'avoids', severity: 'avoid', evidence: `Dislikes: ${item}` });
  }
  for (const field of ['proteins_selected', 'proteins_everyday']) {
    for (const item of splitItems(answers[field])) {
      constraints.push({ item, kind: 'ingredient', direction: 'prefers', severity: 'preference', evidence: `${field}: ${item}` });
    }
  }
  // Dedupe on item+direction, strongest severity wins (medical > avoid > preference)
  const rank = { medical: 3, avoid: 2, preference: 1 };
  const byKey = new Map();
  for (const c of constraints) {
    const key = `${c.direction}|${c.item}`;
    if (!byKey.has(key) || rank[c.severity] > rank[byKey.get(key).severity]) byKey.set(key, c);
  }
  return [...byKey.values()];
}

async function findCustomerForEvent(prisma, payload) {
  const email = String(payload.email || '').toLowerCase();
  if (email) {
    const byEmail = await prisma.brainEntity.findFirst({
      where: {
        entityType: 'Customer',
        tombstonedAt: null,
        OR: [
          { aliases: { some: { alias: { equals: email, mode: 'insensitive' } } } },
          { properties: { path: ['email'], equals: email } },
        ],
      },
    });
    if (byEmail) return byEmail;
  }
  const name = String(payload.clientName || '').trim();
  if (!name) return null;
  return prisma.brainEntity.findFirst({
    where: {
      entityType: 'Customer',
      tombstonedAt: null,
      name: { equals: name, mode: 'insensitive' },
    },
  });
}

/**
 * Mine constraints from intake events.
 * @param {object} opts
 * @param {boolean} opts.force re-mine events even if they already have constraint assertions
 * @param {string}  opts.ledgerEventId mine just one event (used by the intake hook)
 */
async function runConstraintMiner({ logger, force = false, ledgerEventId = null } = {}) {
  const prisma = getPrisma();

  const events = await prisma.ledgerEvent.findMany({
    where: {
      eventType: 'intake.meal_prep.submitted',
      tombstonedAt: null,
      ...(ledgerEventId ? { id: ledgerEventId } : {}),
    },
    orderBy: { occurredAt: 'asc' },
    take: 100,
  });

  let mined = 0;
  let skipped = 0;
  let assertionsCreated = 0;
  const errors = [];

  for (const event of events) {
    try {
      if (!force) {
        const already = await prisma.brainAssertion.findFirst({
          where: { sourceId: event.id, relType: { in: CONSTRAINT_REL_TYPES }, retractedAt: null },
          select: { id: true },
        });
        if (already) { skipped += 1; continue; }
      }

      const payload = event.payload || {};
      const text = intakeConstraintText(payload.answers || {});
      if (!text) { skipped += 1; continue; }

      const customer = await findCustomerForEvent(prisma, payload);
      if (!customer) {
        errors.push(`${event.id}: no Customer entity for ${payload.email || payload.clientName}`);
        continue;
      }

      let constraints;
      let extractor = 'llm';
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          constraints = await extractConstraints(text);
        } catch (err) {
          logger?.warn({ err, eventId: event.id }, 'brain/constraints: LLM extraction failed, using deterministic fallback');
          constraints = deterministicConstraints(payload.answers || {});
          extractor = 'deterministic';
        }
      } else {
        constraints = deterministicConstraints(payload.answers || {});
        extractor = 'deterministic';
      }
      for (const c of constraints) {
        const itemName = String(c.item || '').trim().toLowerCase();
        if (!itemName || itemName.length > 80) continue;

        const { entity: dst } = await findOrCreateEntity({
          entityType: c.kind === 'diet' ? 'Constraint' : 'Ingredient',
          name: itemName,
          properties: { source: 'constraint_miner' },
        });

        const relType = c.direction === 'prefers'
          ? 'PREFERS'
          : c.severity === 'medical' ? 'MEDICAL_CONSTRAINT' : 'AVOIDS';

        const existing = await prisma.brainAssertion.findFirst({
          where: { srcId: customer.id, dstId: dst.id, relType, retractedAt: null, knownUntil: null },
          select: { id: true },
        });
        if (existing) continue;

        await prisma.brainAssertion.create({
          data: {
            srcId: customer.id,
            dstId: dst.id,
            relType,
            metadata: {
              severity: c.severity,
              kind: c.kind,
              verifiedBy: 'customer_direct',
              verifiedAt: (event.occurredAt || new Date()).toISOString(),
              sourceSpan: String(c.evidence || '').slice(0, 300),
              extractor,
            },
            confidence: c.severity === 'medical' ? 0.95 : 0.85,
            sourceType: 'ledger_event',
            sourceId: event.id,
            createdBy: 'system:constraint_miner',
            validFrom: event.occurredAt || new Date(),
            provisional: false,
          },
        });
        assertionsCreated += 1;
      }

      await writeLedgerEvent({
        eventType: 'constraints.mined',
        source: 'constraint_miner',
        sourceId: event.id,
        payload: {
          intakeLedgerEventId: event.id,
          customerId: customer.id,
          customerName: customer.name,
          constraintCount: constraints.length,
          extractor,
        },
      });
      mined += 1;
      logger?.info({ eventId: event.id, customer: customer.name, constraints: constraints.length }, 'brain/constraints: intake mined');
    } catch (err) {
      errors.push(`${event.id}: ${err.message}`);
      logger?.warn({ err, eventId: event.id }, 'brain/constraints: mining failed');
    }
  }

  return { mined, skipped, assertionsCreated, errors };
}

module.exports = { runConstraintMiner };
