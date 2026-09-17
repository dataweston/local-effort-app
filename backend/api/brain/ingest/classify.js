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
 * Intents: constraint_correction | vendor_price | event | task | new_entity |
 *          append_note | trash | needs_human
 */

const { parseCorrectionText } = require('../constraintCorrection');
const { llmJson, hasLlm } = require('../llmJson');

const LLM_FALLBACK_THRESHOLD = 0.6;

// ── tag detection (optional, sharpen only) ─────────────────────────────────────
const TAG_RE = /^\s*(diet|constraint|price|cost|event|booking|task|todo|vendor|supplier|contact|note)\s*[:#]\s*/i;
function stripTag(text) {
  const m = text.match(TAG_RE);
  if (!m) return { tag: null, body: text };
  return { tag: m[1].toLowerCase(), body: text.slice(m[0].length).trim() };
}
const MONTH_NUMBERS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10,
  october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function normalizeDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function inferredYear(month, day, ctx) {
  const todayString = /^\d{4}-\d{2}-\d{2}$/.test(ctx?.today || '')
    ? ctx.today
    : new Date().toISOString().slice(0, 10);
  const currentYear = Number(todayString.slice(0, 4));
  const candidate = normalizeDate(currentYear, month, day);
  return candidate && candidate >= todayString ? currentYear : currentYear + 1;
}

function parseEventDate(text, ctx) {
  let match = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (match) {
    return { date: normalizeDate(Number(match[1]), Number(match[2]), Number(match[3])), raw: match[0], index: match.index };
  }

  match = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let year = match[3] ? Number(match[3]) : inferredYear(month, day, ctx);
    if (year < 100) year += 2000;
    return { date: normalizeDate(year, month, day), raw: match[0], index: match.index };
  }

  match = text.match(/\b(january|february|march|april|may|june|july|august|september|sept|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:,\s*(20\d{2}))?\b/i);
  if (!match) return { date: null, raw: null, index: -1 };
  const month = MONTH_NUMBERS[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = match[3] ? Number(match[3]) : inferredYear(month, day, ctx);
  return { date: normalizeDate(year, month, day), raw: match[0], index: match.index };
}

function clockTime(hourValue, minuteValue, meridiem) {
  let hour = Number(hourValue);
  if (hour < 1 || hour > 12) return null;
  if (meridiem.toLowerCase() === 'am') {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return `${String(hour).padStart(2, '0')}:${minuteValue || '00'}`;
}

function parseEventTime(text) {
  const range = text.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\s*(?:-|–|—|to)\s*(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (range) {
    return {
      startTime: clockTime(range[1], range[2], range[3]),
      endTime: clockTime(range[4], range[5], range[6]),
      raw: range[0],
    };
  }
  const single = text.match(/\b(?:at\s+)?(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (!single) return { startTime: null, endTime: null, raw: null };
  return { startTime: clockTime(single[1], single[2], single[3]), endTime: null, raw: single[0] };
}

function labeledValue(text, label) {
  const match = text.match(new RegExp(`(?:^|[|;])\\s*${label}\\s*:\\s*([^|;]+)`, 'i'));
  return match ? match[1].trim() : null;
}

function matchEvent(text, ctx) {
  const { tag, body } = stripTag(text);
  const tagged = tag === 'event' || tag === 'booking';
  const hasEventNoun = /\b(event|booking|wedding|baby shower|anniversary|private dinner|catering|party|reception)\b/i.test(body);
  if (!tagged && !hasEventNoun) return null;

  const prepMarker = body.match(/(?:^|[|;])\s*prep\s*:\s*/i);
  const serviceText = prepMarker ? body.slice(0, prepMarker.index) : body;
  const prepText = prepMarker ? body.slice(prepMarker.index + prepMarker[0].length) : '';
  const serviceDate = parseEventDate(serviceText, ctx);
  const serviceTime = parseEventTime(serviceText);
  const prepDate = parseEventDate(prepText, ctx);
  const prepTime = parseEventTime(prepText);
  const guestsMatch = serviceText.match(/\b(\d+)\s+guests?\b/i)
    || serviceText.match(/(?:^|[|;])\s*guests?\s*:\s*(\d+)\b/i);
  const explicitTitle = labeledValue(body, 'title');
  const titleCandidates = serviceText
    .split('|')
    .map((section) => section.trim())
    .filter((section) => section && !/^(?:date|time|location|guests?|menu)\s*:/i.test(section));
  const cleanedTitleCandidates = titleCandidates.map((candidate) => {
    let cleaned = candidate;
    if (serviceDate.raw) cleaned = cleaned.replace(serviceDate.raw, ' ');
    if (serviceTime.raw) cleaned = cleaned.replace(serviceTime.raw, ' ');
    return cleaned
      .replace(/^\s*(?:title\s*:|on\s+)/i, '')
      .replace(/^\s*(?:sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)\b[\s,]*/i, '')
      .replace(/^[\s,;|:-]+|[\s,;|:-]+$/g, '')
      .trim();
  });
  const title = (explicitTitle || cleanedTitleCandidates.find((candidate) => candidate && !/^event$/i.test(candidate)) || 'Untitled event')
    .slice(0, 160);

  const status = /\b(booked|confirmed)\b/i.test(serviceText) ? 'confirmed' : 'inquiry';
  const confidence = tagged ? 0.9 : (serviceDate.date ? 0.68 : 0.45);
  return {
    intent: 'event',
    confidence,
    fields: {
      title: title.slice(0, 160),
      date: serviceDate.date,
      startTime: serviceTime.startTime,
      endTime: serviceTime.endTime,
      location: labeledValue(body, 'location'),
      guestEstimate: guestsMatch ? Number(guestsMatch[1]) : null,
      menuSummary: labeledValue(body, 'menu'),
      prepDate: prepDate.date,
      prepStartTime: prepTime.startTime,
      prepEndTime: prepTime.endTime,
      status,
      note: body,
    },
  };
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

const MATCHERS = [matchConstraint, matchVendorPrice, matchNewEntity, matchEvent, matchTask, matchNote];

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
    intent: { type: 'string', enum: ['constraint_correction', 'vendor_price', 'event', 'task', 'new_entity', 'append_note', 'trash', 'needs_human'] },
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
    title: { type: ['string', 'null'], description: 'event or task title' },
    date: { type: ['string', 'null'], description: 'event service date as YYYY-MM-DD' },
    startTime: { type: ['string', 'null'], description: 'event service start as HH:mm' },
    endTime: { type: ['string', 'null'], description: 'event service end as HH:mm' },
    location: { type: ['string', 'null'] },
    guestEstimate: { type: ['number', 'null'] },
    menuSummary: { type: ['string', 'null'] },
    prepDate: { type: ['string', 'null'], description: 'prep date as YYYY-MM-DD' },
    prepStartTime: { type: ['string', 'null'], description: 'prep start as HH:mm' },
    prepEndTime: { type: ['string', 'null'], description: 'prep end as HH:mm' },
    status: { type: ['string', 'null'], enum: ['inquiry', 'tentative', 'confirmed', 'scheduled', null] },
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
- event: a catering/private-chef booking with a service date. Fill title, date, service start/end, location, guestEstimate, menuSummary, prep date/start/end, and status. Leave unknown fields null; never invent dates or times.
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

module.exports = { classify, classifyDeterministic, matchEvent, parseEventDate, parseEventTime, LLM_FALLBACK_THRESHOLD };
