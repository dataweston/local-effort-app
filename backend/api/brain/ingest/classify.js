/**
 * Ingest classification — STAGE 1 of the single ingest engine.
 *
 * Deterministic-first: a priority-ordered list of cheap matchers, each returns
 * { intent, fields, confidence } or null. Light optional tags (diet:, price:,
 * task:, vendor:, note:, #avoid, #medical) push a match to high confidence;
 * plain language still matches at lower confidence. If the best deterministic
 * confidence is below LLM_FALLBACK_THRESHOLD and a provider is configured,
 * the shared LLM fallback is asked with the union schema. No provider plus a
 * deterministic miss => needs_human.
 *
 * Intents: constraint_correction | vendor_price | task | new_entity |
 *          append_note | trash | needs_human
 */

const { parseCorrectionText } = require('../constraintCorrection');
const { llmJson, hasLlm } = require('../llmJson');

const LLM_FALLBACK_THRESHOLD = 0.6;

// ── tag detection (optional, sharpen only) ─────────────────────────────────────
const TAG_RE = /^\s*(diet|constraint|price|cost|task|todo|vendor|supplier|contact|note)\s*[:#]\s*/i;
function stripTag(text) {
  const m = text.match(TAG_RE);
  if (!m) return { tag: null, body: text };
  return { tag: m[1].toLowerCase(), body: text.slice(m[0].length).trim() };
}

// ── deterministic matchers ─────────────────────────────────────────────────────

// constraint_correction — dietary avoid/prefer/medical for a customer.
function matchConstraint(text, ctx) {
  const { tag, body } = stripTag(text);
  const tagged = tag === 'diet' || tag === 'constraint';
  const parsed = parseCorrectionText(tagged ? body : text);
  if (!parsed.corrections.length) return null;
  // Need a customer: either a parsed name or a picker-provided customerId.
  const hasCustomer = !!parsed.customerRef || !!ctx?.customerId;
  if (!hasCustomer) return null;
  // Dietary verbs are fairly specific; tag or a resolved customerId boosts.
  let confidence = 0.6;
  if (tagged) confidence = 0.9;
  else if (ctx?.customerId) confidence = 0.85;
  // medical phrasing is high-signal
  if (parsed.corrections.some(c => c.severity === 'medical')) confidence = Math.max(confidence, 0.8);
  return {
    intent: 'constraint_correction',
    confidence,
    fields: {
      customerRef: parsed.customerRef,
      corrections: parsed.corrections, // [{item, kind, direction, severity, validUntil}]
    },
  };
}

// vendor_price — "CPW carrots $1.20/lb", "price: flour $0.85 per lb from Bakers Field"
const PRICE_RE = /\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:\/|per\s+)?\s*(lb|lbs|pound|pounds|oz|kg|g|each|ea|case|dozen|doz|gal|gallon|qt|pint|unit|bunch|head|ct)?\b/i;
function matchVendorPrice(text) {
  const { tag, body } = stripTag(text);
  const tagged = tag === 'price' || tag === 'cost';
  const src = tagged ? body : text;
  const pm = src.match(PRICE_RE);
  if (!pm) return null;
  const priceDollars = Number(pm[1]);
  if (!Number.isFinite(priceDollars) || priceDollars <= 0) return null;
  // Need at least an item word; vendor optional ("from X" / "@ X").
  const vendorMatch = src.match(/\b(?:from|@|at)\s+([A-Za-z][\w.'& \-]{1,40})/i);
  // ingredient = the non-price, non-vendor remainder (best-effort)
  let item = src
    .replace(PRICE_RE, ' ')
    .replace(/\b(?:from|@|at)\s+[A-Za-z][\w.'& \-]{1,40}/i, ' ')
    .replace(/\b(per|each|price|cost|for)\b/gi, ' ')
    .replace(/[.!?]+$/g, '')
    .trim().toLowerCase();
  if (!item || item.length < 2) return null;
  let confidence = tagged ? 0.85 : 0.62;
  if (vendorMatch) confidence += 0.05;
  return {
    intent: 'vendor_price',
    confidence: Math.min(confidence, 0.95),
    fields: {
      item,
      unit: (pm[2] || 'unit').toLowerCase(),
      priceDollars,
      priceCents: Math.round(priceDollars * 100),
      vendorRef: vendorMatch ? vendorMatch[1].trim() : null,
    },
  };
}

// task — imperative reminders. "task: call flour guy", "order more eggs", "remember to..."
const TASK_VERBS = /^\s*(call|email|text|order|buy|pick up|pickup|schedule|book|remind|remember to|follow up|send|pay|invoice|prep|make|check|confirm|ask|tell|drop off|deliver)\b/i;
function matchTask(text) {
  const { tag, body } = stripTag(text);
  if (tag === 'task' || tag === 'todo') {
    return { intent: 'task', confidence: 0.85, fields: { title: body.replace(/[.!?]+$/, '').trim() } };
  }
  if (TASK_VERBS.test(text)) {
    return { intent: 'task', confidence: 0.62, fields: { title: text.replace(/[.!?]+$/, '').trim() } };
  }
  return null;
}

// new_entity — "vendor: Sunrise Farms (eggs)", "contact: ..."
function matchNewEntity(text) {
  const { tag, body } = stripTag(text);
  if (tag === 'vendor' || tag === 'supplier') {
    const name = body.split(/[,(]/)[0].trim();
    if (name) return { intent: 'new_entity', confidence: 0.85, fields: { entityType: 'Vendor', name, note: body } };
  }
  if (tag === 'contact') {
    const name = body.split(/[,(]/)[0].trim();
    if (name) return { intent: 'new_entity', confidence: 0.8, fields: { entityType: 'Customer', name, note: body } };
  }
  return null;
}

// append_note — explicit note tag, or a default low-confidence catch handled elsewhere.
function matchNote(text) {
  const { tag, body } = stripTag(text);
  if (tag === 'note') {
    return { intent: 'append_note', confidence: 0.75, fields: { note: body } };
  }
  return null;
}

const MATCHERS = [matchConstraint, matchVendorPrice, matchNewEntity, matchTask, matchNote];

function classifyDeterministic(text, ctx) {
  let best = null;
  for (const fn of MATCHERS) {
    const r = fn(text, ctx);
    if (r && (!best || r.confidence > best.confidence)) best = r;
  }
  return best;
}

// ── LLM fallback (union schema) ────────────────────────────────────────────────

const UNION_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['constraint_correction', 'vendor_price', 'task', 'new_entity', 'append_note', 'trash', 'needs_human'] },
    customerRef: { type: ['string', 'null'], description: 'Customer name/email for constraint_correction' },
    corrections: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          kind: { type: 'string', enum: ['ingredient', 'diet'] },
          direction: { type: 'string', enum: ['avoids', 'prefers'] },
          severity: { type: 'string', enum: ['medical', 'avoid', 'preference'] },
          validUntil: { type: ['string', 'null'], description: 'ISO date or null' },
        },
        required: ['item', 'kind', 'direction', 'severity', 'validUntil'],
        additionalProperties: false,
      },
    },
    item: { type: ['string', 'null'], description: 'ingredient for vendor_price' },
    unit: { type: ['string', 'null'] },
    priceCents: { type: ['number', 'null'] },
    vendorRef: { type: ['string', 'null'] },
    entityType: { type: ['string', 'null'] },
    name: { type: ['string', 'null'] },
    title: { type: ['string', 'null'], description: 'task title' },
    note: { type: ['string', 'null'] },
    confidence: { type: 'number' },
    rationale: { type: 'string' },
  },
  required: ['intent', 'confidence', 'rationale'],
  additionalProperties: false,
};

async function classifyWithLlm(text, ctx) {
  const customerHint = ctx?.customerName
    ? `\nThe operator has pre-selected customer "${ctx.customerName}" — treat ambiguous "customer" references as this person.`
    : '';
  const prompt = `Classify this captured note from Local Effort Food (a Minneapolis meal-prep + events business) into ONE ingest intent and extract structured fields.

INTENTS:
- constraint_correction: a customer's dietary change (avoid/prefer/allergy). Fill customerRef + corrections[]. severity: medical=allergy/intolerance, avoid=firm no, preference=mild. validUntil if time-boxed ("this month").
- vendor_price: an ingredient price from a vendor. Fill item, unit, priceCents, vendorRef.
- task: a to-do/reminder. Fill title.
- new_entity: a vendor/customer/contact to remember. Fill entityType + name.
- append_note: a freeform note. Fill note.
- trash: noise/irrelevant.
- needs_human: anything ambiguous or high-stakes.${customerHint}

Read literally; do not invent. CONTENT:
${text}`;
  const { data: d, via } = await llmJson({ prompt, schema: UNION_SCHEMA, maxTokens: 1024, schemaName: 'brain_ingest_classification' });
  const { intent, confidence, rationale, ...rest } = d;
  return {
    intent,
    confidence: Math.min(0.95, Math.max(0.1, Number(confidence) || 0.5)),
    fields: rest,
    rationale,
    via,
  };
}

/**
 * Classify text → { intent, confidence, fields, via }.
 * Deterministic-first; provider fallback when below threshold and a key is present.
 */
async function classify(text, ctx = {}) {
  const det = classifyDeterministic(text, ctx);
  if (det && det.confidence >= LLM_FALLBACK_THRESHOLD) {
    return { ...det, via: 'deterministic' };
  }
  if (hasLlm()) {
    try {
      const llm = await classifyWithLlm(text, ctx);
      // Prefer the more confident of the two.
      if (!det || llm.confidence >= det.confidence) return llm;
      return { ...det, via: 'deterministic' };
    } catch (err) {
      if (det) return { ...det, via: 'deterministic-fallback' };
      return { intent: 'needs_human', confidence: 0.2, fields: {}, via: 'error', error: err.message };
    }
  }
  if (det) return { ...det, via: 'deterministic-lowconf' };
  return { intent: 'needs_human', confidence: 0.2, fields: {}, via: 'no-llm' };
}

module.exports = { classify, classifyDeterministic, LLM_FALLBACK_THRESHOLD };
