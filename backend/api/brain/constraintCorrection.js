/**
 * Real-time dietary constraint corrections.
 *
 * The constraint MINER (`constraintMiner.js`) seeds a customer's constraints from
 * their intake form. But customers change their minds between intakes — e.g. a
 * customer whose intake said "legumes desired" texts the founder mid-month: "please
 * exclude legumes this month." There was no capture path for that ad-hoc correction;
 * this module is it.
 *
 * A correction:
 *   1. Resolves the target Customer (by id, email, or name — never mints).
 *   2. Resolves the Ingredient/Constraint item (find-or-create, same as the miner).
 *   3. SUPERSEDES any conflicting active assertion for that customer+item — e.g. a
 *      PREFERS legumes is closed (knownUntil = now, supersededBy = new id) when an
 *      AVOIDS legumes correction arrives. This is the bitemporal point: the old
 *      belief stays in history, the current graph reflects the correction.
 *   4. Writes the new constraint assertion in the exact shape
 *      `menuRoutes.checkConstraints` reads (relType + metadata.severity), with
 *      validFrom = now and an optional validUntil (for "this month only").
 *   5. Writes a `constraint.corrected` ledger event for audit.
 *
 * Severity → relType, same mapping as the miner:
 *   prefers                    -> PREFERS
 *   avoids + severity medical  -> MEDICAL_CONSTRAINT
 *   avoids + severity avoid|preference -> AVOIDS
 *
 * MEDICAL_CONSTRAINT corrections are accepted here (this is a trusted staff path,
 * unlike the MCP tools which forbid it) but require an explicit actor.
 */

const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { writeLedgerEvent, findOrCreateEntity, canonicalName } = require('./ledger');

const verifyAdminRequest = createAdminVerifier();

const DIRECTIONS = new Set(['avoids', 'prefers']);
const SEVERITIES = new Set(['medical', 'avoid', 'preference']);

function relTypeFor(direction, severity) {
  if (direction === 'prefers') return 'PREFERS';
  return severity === 'medical' ? 'MEDICAL_CONSTRAINT' : 'AVOIDS';
}

// The three constraint relTypes that can conflict for a (customer, item) pair.
const CONSTRAINT_RELS = ['PREFERS', 'AVOIDS', 'MEDICAL_CONSTRAINT'];

async function resolveCustomer(prisma, { customerId, email, name }) {
  if (customerId) {
    const c = await prisma.brainEntity.findFirst({
      where: { id: customerId, entityType: 'Customer', tombstonedAt: null },
    });
    if (c) return c;
  }
  if (email) {
    const e = String(email).toLowerCase();
    const c = await prisma.brainEntity.findFirst({
      where: {
        entityType: 'Customer', tombstonedAt: null,
        OR: [
          { aliases: { some: { alias: { equals: e, mode: 'insensitive' } } } },
          { properties: { path: ['email'], equals: e } },
        ],
      },
    });
    if (c) return c;
  }
  if (name) {
    const c = await prisma.brainEntity.findFirst({
      where: { entityType: 'Customer', tombstonedAt: null, name: { equals: String(name).trim(), mode: 'insensitive' } },
    });
    if (c) return c;
  }
  return null;
}

/**
 * Apply one constraint correction.
 * @returns {{ ok, customerId, itemEntityId, relType, supersededIds, assertionId }}
 */
async function applyConstraintCorrection({
  customerId, email, name,           // customer resolution (any one)
  item,                              // food/diet name, e.g. "legumes"
  kind = 'ingredient',               // 'ingredient' | 'diet'
  direction,                         // 'avoids' | 'prefers'
  severity,                          // 'medical' | 'avoid' | 'preference'
  validUntil = null,                 // ISO string for time-boxed (e.g. end of month); null = open-ended
  note = null,                       // free-text context (the text/message body)
  actor = 'staff',                   // who applied it (founder/staff/email/sms)
  logger,
} = {}) {
  const prisma = getPrisma();

  const itemName = String(item || '').trim().toLowerCase();
  if (!itemName || itemName.length > 80) throw new Error('item is required (<=80 chars)');
  if (!DIRECTIONS.has(direction)) throw new Error(`direction must be one of ${[...DIRECTIONS].join('|')}`);
  if (!SEVERITIES.has(severity)) throw new Error(`severity must be one of ${[...SEVERITIES].join('|')}`);

  const customer = await resolveCustomer(prisma, { customerId, email, name });
  if (!customer) throw new Error('customer not found (resolve by id, email, or name — corrections never mint customers)');

  const { entity: dst } = await findOrCreateEntity({
    entityType: kind === 'diet' ? 'Constraint' : 'Ingredient',
    name: itemName,
    properties: { source: 'constraint_correction' },
  });

  const newRelType = relTypeFor(direction, severity);
  const now = new Date();

  // Find conflicting/duplicate active assertions for this (customer, item) across
  // all three constraint relTypes — a correction overrides whatever was believed.
  const priors = await prisma.brainAssertion.findMany({
    where: {
      srcId: customer.id, dstId: dst.id,
      relType: { in: CONSTRAINT_RELS },
      retractedAt: null, knownUntil: null,
    },
    select: { id: true, relType: true },
  });

  const ledgerEvent = await writeLedgerEvent({
    eventType: 'constraint.corrected',
    source: 'constraint_correction',
    actorType: actor === 'founder' ? 'founder' : 'staff',
    actorId: actor,
    payload: {
      customerId: customer.id, customerName: customer.name,
      item: itemName, kind, direction, severity, relType: newRelType,
      validUntil: validUntil || null, note: note || null,
      supersedes: priors.map(p => ({ id: p.id, relType: p.relType })),
    },
  });

  const assertion = await prisma.brainAssertion.create({
    data: {
      srcId: customer.id,
      dstId: dst.id,
      relType: newRelType,
      metadata: {
        severity, kind,
        verifiedBy: 'customer_direct',
        verifiedAt: now.toISOString(),
        sourceSpan: note ? String(note).slice(0, 300) : `correction: ${direction} ${itemName}`,
        extractor: 'manual',
        correction: true,
        ...(validUntil ? { validUntilReason: 'time_boxed_correction' } : {}),
      },
      confidence: severity === 'medical' ? 0.95 : 0.9,
      sourceType: 'ledger_event',
      sourceId: ledgerEvent.id,
      createdBy: `correction:${actor}`,
      validFrom: now,
      validUntil: validUntil ? new Date(validUntil) : null,
      knownFrom: now,
      provisional: false,
    },
  });

  // Supersede the priors: close their knowledge window and point at the new row.
  const supersededIds = priors.map(p => p.id);
  if (supersededIds.length) {
    await prisma.brainAssertion.updateMany({
      where: { id: { in: supersededIds } },
      data: { knownUntil: now, supersededBy: assertion.id, supersededAt: now, supersededReason: 'constraint_correction' },
    });
  }

  logger?.info(
    { customer: customer.name, item: itemName, relType: newRelType, superseded: supersededIds.length, validUntil: validUntil || null },
    'brain/constraint-correction: applied'
  );

  return {
    ok: true,
    customerId: customer.id,
    customerName: customer.name,
    itemEntityId: dst.id,
    relType: newRelType,
    supersededIds,
    assertionId: assertion.id,
    validUntil: validUntil || null,
  };
}

// ── Free-text parser (founder quick-capture) ────────────────────────────────
// Turns a quick note like "Samantha: no legumes this month" or
// "for Dave Levy avoid shellfish (allergy)" into one or more structured
// corrections. Deterministic — no LLM. Returns { customerRef, corrections[] }.

const AVOID_WORDS = /\b(no|avoid|avoids|exclude|excludes|excluding|without|skip|hold the|leave out|cut|drop|can't have|cannot have|allergic to|stop)\b/i;
const PREFER_WORDS = /\b(likes?|loves?|wants?|prefers?|add|include|more|enjoys?|ok with|okay with|fine with)\b/i;
const MEDICAL_WORDS = /\b(allerg(y|ic)|anaphyla|celiac|intoleran|medical|cannot have|can't have)\b/i;

function parseDuration(text, now = new Date()) {
  const t = text.toLowerCase();
  // An explicit "until <date>" always wins over a relative window.
  const until = t.match(/until\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
  if (until) {
    const raw = until[1];
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) d = new Date(raw + 'T00:00:00Z');
    else {
      const [mo, da, yr] = raw.split('/');
      const year = yr ? (yr.length === 2 ? 2000 + Number(yr) : Number(yr)) : now.getUTCFullYear();
      d = new Date(Date.UTC(year, Number(mo) - 1, Number(da)));
    }
    if (!isNaN(d)) return d.toISOString();
  }
  // "this month" / "for the month" / "rest of the month" → end of current month
  if (/\b(this month|the month|rest of the month|for the month)\b/.test(t)) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  }
  // "this week" → next Monday (UTC)
  if (/\b(this week|the week|for the week)\b/.test(t)) {
    const d = new Date(now); const day = d.getUTCDay(); const add = ((8 - day) % 7) || 7;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + add)).toISOString();
  }
  return null;
}

const STOP_ITEM_WORDS = new Set(['this', 'the', 'for', 'a', 'an', 'and', 'or', 'to', 'of', 'month', 'week', 'please', 'her', 'his', 'their', 'diet', 'meals', 'meal', 'more', 'some', 'any', 'all']);

function stripLeadingStopwords(s) {
  let out = s;
  let prev;
  do { prev = out; out = out.replace(/^(more|some|any|all|of|the)\s+/i, ''); } while (out !== prev);
  return out;
}

function parseCorrectionText(text, now = new Date()) {
  const raw = String(text || '').trim();
  if (!raw) return { customerRef: null, corrections: [], error: 'empty text' };

  // Customer ref: "Name: ..." / "Name - ..." (preferred, explicit delimiter), or
  // "for Name <verb> ..." where the name runs up to the first direction word.
  let customerRef = null;
  let body = raw;
  const colon = raw.match(/^\s*([A-Za-z][\w.'\- ]{1,60}?)\s*[:\-–]\s*(.+)$/);
  if (colon) {
    customerRef = colon[1].trim();
    body = colon[2].trim();
  } else {
    // "for <Name words...> <avoid|no|likes|...> <items>" — split the name at the verb.
    const forMatch = raw.match(/^\s*for\s+(.+)$/i);
    if (forMatch) {
      const rest = forMatch[1];
      const verb = rest.search(new RegExp(`(${AVOID_WORDS.source}|${PREFER_WORDS.source})`, 'i'));
      if (verb > 0) {
        customerRef = rest.slice(0, verb).trim().replace(/[,]+$/, '');
        body = rest.slice(verb).trim();
      }
    }
  }

  const direction = AVOID_WORDS.test(body) ? 'avoids' : (PREFER_WORDS.test(body) ? 'prefers' : 'avoids');
  const severity = direction === 'prefers'
    ? 'preference'
    : (MEDICAL_WORDS.test(body) ? 'medical' : 'avoid');
  const validUntil = parseDuration(body, now);

  // Items: strip the direction/duration words, split on commas/and/or.
  let itemText = body
    .replace(AVOID_WORDS, ' ').replace(PREFER_WORDS, ' ')
    .replace(/\b(this month|the month|rest of the month|for the month|this week|the week|for the week)\b/gi, ' ')
    .replace(/until\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi, ' ')
    .replace(/\((?:allerg[^)]*|medical[^)]*)\)/gi, ' ')
    .replace(/[.!?]+$/g, '');
  const items = itemText
    .split(/[,;]|\band\b|\bor\b|\//i)
    .map(s => stripLeadingStopwords(s.trim().toLowerCase()))
    .filter(s => s.length >= 2 && s.length <= 40 && !STOP_ITEM_WORDS.has(s));

  const corrections = items.map(item => ({ item, kind: 'ingredient', direction, severity, validUntil }));
  return { customerRef, corrections, parsedFrom: raw };
}

/**
 * Apply a free-text quick-capture correction (one note, possibly multiple items).
 * Resolves the customer by the parsed name. Returns per-item results.
 */
async function applyCorrectionFromText({ text, customerId = null, note = null, actor = 'founder', logger } = {}) {
  const parsed = parseCorrectionText(text);
  if (parsed.error) throw new Error(parsed.error);
  if (!parsed.corrections.length) throw new Error('no constraint items found in text');
  if (!customerId && !parsed.customerRef) {
    throw new Error('could not identify a customer — prefix with "Name:" or pass customerId');
  }

  const results = [];
  for (const c of parsed.corrections) {
    const r = await applyConstraintCorrection({
      customerId: customerId || undefined,
      name: customerId ? undefined : parsed.customerRef,
      item: c.item, kind: c.kind, direction: c.direction, severity: c.severity,
      validUntil: c.validUntil, note: note || parsed.parsedFrom, actor, logger,
    });
    results.push(r);
  }
  return { ok: true, customerRef: parsed.customerRef, count: results.length, results };
}

// ── Route ─────────────────────────────────────────────────────────────────────

function registerConstraintCorrectionRoutes(app, { logger } = {}) {
  // POST /api/brain/constraints/correct
  // Body: { customerId|email|name, item, kind?, direction, severity, validUntil?, note?, actor? }
  app.post('/api/brain/constraints/correct', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const b = req.body || {};
      const result = await applyConstraintCorrection({
        customerId: b.customerId, email: b.email, name: b.name,
        item: b.item, kind: b.kind || 'ingredient',
        direction: b.direction, severity: b.severity,
        validUntil: b.validUntil || null, note: b.note || null,
        actor: b.actor || 'staff',
        logger,
      });
      return res.json(result);
    } catch (err) {
      const msg = err?.message || 'internal-error';
      const status = /required|must be|not found/.test(msg) ? 400 : 500;
      if (status === 500) logger?.error({ err }, 'brain/constraint-correction: error');
      return res.status(status).json({ ok: false, error: msg });
    }
  });

  // POST /api/brain/constraints/quick-capture — founder quick-capture.
  // Body: { text: "Samantha: no legumes this month", customerId?, dryRun? }
  // Parses free text → one or more corrections and applies them. With dryRun,
  // returns the parse without writing (lets a Hub field preview before commit).
  app.post('/api/brain/constraints/quick-capture', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { text, customerId = null, note = null, dryRun = false } = req.body || {};
      if (!text || !String(text).trim()) return res.status(400).json({ ok: false, error: 'text is required' });

      if (dryRun) {
        return res.json({ ok: true, dryRun: true, parsed: parseCorrectionText(text) });
      }
      const result = await applyCorrectionFromText({ text, customerId, note, actor: 'founder', logger });
      return res.json(result);
    } catch (err) {
      const msg = err?.message || 'internal-error';
      const status = /required|must be|not found|could not|no constraint/.test(msg) ? 400 : 500;
      if (status === 500) logger?.error({ err }, 'brain/constraint-quick-capture: error');
      return res.status(status).json({ ok: false, error: msg });
    }
  });
}

module.exports = {
  applyConstraintCorrection,
  applyCorrectionFromText,
  parseCorrectionText,
  registerConstraintCorrectionRoutes,
};
