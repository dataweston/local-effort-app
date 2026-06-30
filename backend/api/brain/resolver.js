/**
 * Shared entity resolver — the single place a name/id becomes ONE canonical
 * BrainEntity. The ingest engine, projectors, and future source syncs all call
 * `resolveEntity` so every signal binds to the same node by stable keys.
 *
 * Why this is the unblock for inference (docs/brain-resolution-needs.md):
 *   - Vendors: 14/146 had aliases → a payment merchantName matched almost
 *     nothing. AVOIDS/PREFERS/PRICE_DRIFT silently produced zero.
 *   - 0 ledger events carried vendorEntityId/customerEntityId → the hypothesis
 *     engine resolved to nothing every run.
 *   The resolver fixes the MECHANISM: match by the best available key, then
 *   BACKFILL the key/alias so the next signal resolves cheaply and the two
 *   inference engines can read one shared id.
 *
 * Match precedence (highest confidence first):
 *   1. FK anchor   (squareCustomerId / localEffortCustomerId / localBudgetVendorId)
 *   2. exact alias (case-insensitive)
 *   3. canonicalName
 *   4. create (only when opts.create === true and not self-identity)
 *
 * Backfill on every successful match:
 *   - set a missing FK anchor when a stable id was supplied
 *   - add the incoming name as an alias when it differs and isn't already one
 */

const { getPrisma } = require('../utils/prisma');
const { canonicalName } = require('./ledger');
const { checkSelfIdentity } = require('./selfIdentity');

// entityType-appropriate FK anchor fields on BrainEntity.
const FK_FIELD = {
  Customer: 'squareCustomerId',          // primary; localEffortCustomerId also valid
  Vendor: 'localBudgetVendorId',
};
const ALL_FK_FIELDS = ['squareCustomerId', 'localEffortCustomerId', 'localBudgetVendorId', 'localEffortDishId', 'plannerCardId'];

/**
 * @param {object} opts
 * @param {string} opts.type        entityType (Customer, Vendor, Ingredient, …)
 * @param {string} [opts.name]      display name to match / alias
 * @param {object} [opts.ids]       stable ids, e.g. { squareCustomerId, localEffortCustomerId, localBudgetVendorId }
 * @param {string[]} [opts.aliases] extra alias strings to attach on match
 * @param {boolean} [opts.create]   create a new entity if nothing matches (default false)
 * @param {object} [opts.properties] properties for a created entity
 * @param {boolean} [opts.mergeProperties] when matching an EXISTING entity, merge
 *   `properties` onto it (existing keys win on conflict, so we enrich without
 *   clobbering). Off by default — resolution shouldn't mutate matched entities
 *   unless the caller is doing an enrichment import.
 * @returns {Promise<{entity, matchedBy, created, blocked?, blockReason?}>}
 */
async function resolveEntity({ type, name = null, ids = {}, aliases = [], create = false, properties = null, mergeProperties = false } = {}) {
  const prisma = getPrisma();
  if (!type) throw new Error('resolveEntity: type is required');

  let entity = null;
  let matchedBy = null;

  // 1. FK anchor (most reliable).
  for (const field of ALL_FK_FIELDS) {
    const val = ids?.[field];
    if (!val) continue;
    const hit = await prisma.brainEntity.findFirst({
      where: { entityType: type, tombstonedAt: null, [field]: String(val) },
    });
    if (hit) { entity = hit; matchedBy = `fk:${field}`; break; }
  }

  // 2. exact alias.
  if (!entity && name) {
    const aliasHit = await prisma.brainEntityAlias.findFirst({
      where: { alias: { equals: name, mode: 'insensitive' }, entity: { entityType: type, tombstonedAt: null } },
      include: { entity: true },
    });
    if (aliasHit?.entity) { entity = aliasHit.entity; matchedBy = 'alias'; }
  }

  // 3. canonicalName / exact name.
  if (!entity && name) {
    const norm = canonicalName(name);
    const hit = await prisma.brainEntity.findFirst({
      where: {
        entityType: type, tombstonedAt: null,
        OR: [{ canonicalName: norm }, { name: { equals: name, mode: 'insensitive' } }],
      },
    });
    if (hit) { entity = hit; matchedBy = 'canonicalName'; }
  }

  // 4. create (guarded).
  if (!entity) {
    if (!create) return { entity: null, matchedBy: null, created: false };
    const self = name ? checkSelfIdentity(type, name) : { blocked: false };
    if (self.blocked) return { entity: null, matchedBy: null, created: false, blocked: true, blockReason: self.reason };
    const data = {
      entityType: type,
      name: name || `(unnamed ${type})`,
      canonicalName: canonicalName(name || `${type} ${Date.now()}`),
      status: 'active',
      properties: properties || null,
    };
    // stamp FK anchors on creation
    for (const field of ALL_FK_FIELDS) if (ids?.[field]) data[field] = String(ids[field]);
    entity = await prisma.brainEntity.create({ data });
    matchedBy = 'created';
  }

  // ── BACKFILL — the compounding part. Make the next resolution cheaper. ──
  if (entity && matchedBy !== 'created') {
    const update = {};
    // set any missing FK anchor we now know
    for (const field of ALL_FK_FIELDS) {
      if (ids?.[field] && !entity[field]) update[field] = String(ids[field]);
    }
    // enrichment imports: merge new properties, but never clobber existing keys.
    if (mergeProperties && properties && typeof properties === 'object') {
      const existing = entity.properties || {};
      const merged = { ...properties, ...existing };
      if (JSON.stringify(merged) !== JSON.stringify(existing)) update.properties = merged;
    }
    if (Object.keys(update).length) {
      entity = await prisma.brainEntity.update({ where: { id: entity.id }, data: update });
    }
    // add the incoming name as an alias if it's a new spelling
    const aliasCandidates = new Set([...(aliases || [])]);
    if (name && canonicalName(name) !== entity.canonicalName) aliasCandidates.add(name);
    for (const a of aliasCandidates) {
      const exists = await prisma.brainEntityAlias.findFirst({ where: { entityId: entity.id, alias: { equals: a, mode: 'insensitive' } } });
      if (!exists) {
        await prisma.brainEntityAlias.create({ data: { entityId: entity.id, alias: a, source: 'resolver_backfill' } }).catch(() => {});
      }
    }
  }

  return { entity, matchedBy, created: matchedBy === 'created' };
}

module.exports = { resolveEntity, FK_FIELD, ALL_FK_FIELDS };
