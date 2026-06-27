/**
 * Dish resolver — turn free-text dish names into canonical brain `Dish` entities.
 *
 * This is the connective tissue for the meal-prep pipeline: notepad lines, master
 * menu rows, intake answers, and parsed emails all arrive as messy strings like
 * "chicken thing w/ the green sauce" or "Nicoise (lunch)". Downstream features
 * (packaging rollups, labels, per-customer menus) need a STABLE identity to group
 * on, so two spellings of the same dish collapse to one count. That identity is a
 * brain `Dish` entity id.
 *
 * Resolution is layered, cheapest-first, and never throws — an unresolved line is
 * a valid result (dishEntityId: null) that a human can disambiguate later:
 *   1. exact canonical-name match   (confidence 1.0,  method 'exact')
 *   2. exact alias match            (confidence 0.95, method 'alias')
 *   3. token-overlap fuzzy match    (confidence 0.4–0.85, method 'fuzzy')
 *   4. no match                     (confidence 0,    method 'none')
 *
 * Candidate names are filtered through foodNameValidator so we never resolve to a
 * gmail-fragment Dish (~19% of Dishes are fragments per docs/brain-data-audit.md).
 *
 * Pure Prisma — no Python sidecar — so it runs inline in request handlers. A
 * future upgrade can layer vector search (POST /api/brain/search) ahead of the
 * fuzzy pass for semantic matches; the return shape is designed to absorb that.
 */

const { getPrisma } = require('../utils/prisma');
const { canonicalName, findOrCreateEntity, writeLedgerEvent } = require('./ledger');
const { foodNameLooksValid, isFoodFragment } = require('./foodNameValidator');

// Words that carry no dish identity — meal slots, plan jargon, packaging units.
// Stripped before tokenizing so "chicken dinner" and "chicken" share tokens.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'with', 'w', 'for', 'in', 'on', 'to',
  'breakfast', 'lunch', 'dinner', 'snack', 'kids', 'meal', 'meals', 'side',
  'gf', 'glutenfree', 'gluten', 'free', 'df', 'dairyfree', 'veg', 'vegetarian',
  'vegan', 'plate', 'bowl', 'portion', 'serving', 'servings', 'each', 'qty',
]);

// Strip a trailing/leading "(dinner)", "[GF]" etc., and collapse punctuation,
// so the matcher sees the dish, not the annotation.
function stripAnnotations(text) {
  return String(text || '')
    .replace(/[([{][^)\]}]*[)\]}]/g, ' ') // (dinner), [GF], {x2}
    .replace(/\b(x|×)\s*\d+\b/gi, ' ') // x2 quantity hints
    .trim();
}

function tokenize(text) {
  return canonicalName(stripAnnotations(text))
    .split(' ')
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

// Jaccard-ish overlap between two token sets, weighted toward covering the query.
// Returns 0..1. Favors candidates that contain all the query's meaningful tokens.
function tokenScore(queryTokens, candidateTokens) {
  if (!queryTokens.length || !candidateTokens.length) return 0;
  const candSet = new Set(candidateTokens);
  const covered = queryTokens.filter((token) => candSet.has(token)).length;
  if (!covered) return 0;
  const coverage = covered / queryTokens.length; // how much of the query is matched
  const precision = covered / candidateTokens.length; // how focused the candidate is
  // Coverage matters most (we want the query fully explained); precision breaks ties.
  return coverage * 0.75 + precision * 0.25;
}

// A canonical Dish entity is one that's active, not tombstoned, and whose name
// passes the food-name validator (rejects the gmail sentence-fragment dishes).
function isCanonicalDish(entity) {
  if (!entity || entity.tombstonedAt) return false;
  if (!foodNameLooksValid(entity.name, 'Dish')) return false;
  if (isFoodFragment(entity.name, 'Dish')) return false;
  return true;
}

function toCandidate(entity, method, confidence) {
  return {
    dishEntityId: entity.id,
    name: entity.name,
    method,
    confidence: Math.round(confidence * 100) / 100,
    allergens: Array.isArray(entity.properties?.allergens) ? entity.properties.allergens : [],
    localEffortDishId: entity.localEffortDishId || null,
  };
}

/**
 * Resolve a single free-text dish name.
 * @returns {Promise<{ query, resolved: boolean, dishEntityId: string|null,
 *   confidence: number, method: string, name: string|null, candidates: object[] }>}
 */
async function resolveDishName(rawText, { prisma = getPrisma(), candidateLimit = 5 } = {}) {
  const query = String(rawText || '').trim();
  const empty = {
    query, resolved: false, dishEntityId: null, confidence: 0,
    method: 'none', name: null, candidates: [],
  };
  if (!query || !prisma) return empty;

  const canon = canonicalName(stripAnnotations(query));
  if (!canon) return empty;

  // 1) Exact canonical-name match.
  const exact = await prisma.brainEntity.findFirst({
    where: { entityType: 'Dish', canonicalName: canon, tombstonedAt: null },
    select: { id: true, name: true, properties: true, localEffortDishId: true, tombstonedAt: true },
  });
  if (exact && isCanonicalDish(exact)) {
    const candidate = toCandidate(exact, 'exact', 1.0);
    return { ...empty, resolved: true, ...candidate, candidates: [candidate] };
  }

  // 2) Exact alias match (case-insensitive).
  const aliasHit = await prisma.brainEntityAlias.findFirst({
    where: {
      alias: { equals: stripAnnotations(query), mode: 'insensitive' },
      entity: { entityType: 'Dish', tombstonedAt: null },
    },
    include: {
      entity: { select: { id: true, name: true, properties: true, localEffortDishId: true, tombstonedAt: true } },
    },
  });
  if (aliasHit?.entity && isCanonicalDish(aliasHit.entity)) {
    const candidate = toCandidate(aliasHit.entity, 'alias', 0.95);
    return { ...empty, resolved: true, ...candidate, candidates: [candidate] };
  }

  // 3) Fuzzy token-overlap match. Pull a bounded set of Dish entities that share
  // at least one meaningful token, score them, and rank. We over-fetch with a
  // cheap OR-contains filter, then score precisely in JS.
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return empty;

  const orFilters = queryTokens.slice(0, 6).map((token) => ({
    name: { contains: token, mode: 'insensitive' },
  }));
  const pool = await prisma.brainEntity.findMany({
    where: { entityType: 'Dish', tombstonedAt: null, OR: orFilters },
    select: { id: true, name: true, properties: true, localEffortDishId: true, tombstonedAt: true },
    take: 200,
  });

  const scored = pool
    .filter(isCanonicalDish)
    .map((entity) => {
      const score = tokenScore(queryTokens, tokenize(entity.name));
      return { entity, score };
    })
    .filter(({ score }) => score >= 0.34)
    .sort((a, b) => b.score - a.score)
    .slice(0, candidateLimit);

  if (!scored.length) return empty;

  const candidates = scored.map(({ entity, score }) =>
    // Map raw 0..1 token score into the fuzzy confidence band (0.4–0.85).
    toCandidate(entity, 'fuzzy', 0.4 + score * 0.45));
  const best = candidates[0];
  return {
    ...empty,
    // Only auto-resolve confident fuzzy matches; the rest are suggestions.
    resolved: best.confidence >= 0.7,
    dishEntityId: best.confidence >= 0.7 ? best.dishEntityId : null,
    confidence: best.confidence,
    method: 'fuzzy',
    name: best.confidence >= 0.7 ? best.name : null,
    candidates,
  };
}

/**
 * Resolve many dish names. Exact/alias passes are independent per name; the fuzzy
 * pass shares one entity pool fetch across the whole batch so a 20-row menu does
 * not issue 20 separate broad queries.
 */
async function resolveDishNames(names, { prisma = getPrisma(), candidateLimit = 5 } = {}) {
  const list = (Array.isArray(names) ? names : [names]).map((n) => String(n || ''));
  if (!prisma) {
    return list.map((query) => ({
      query: query.trim(), resolved: false, dishEntityId: null,
      confidence: 0, method: 'none', name: null, candidates: [],
    }));
  }
  // Sequential is fine for typical menu sizes (<40 rows) and keeps DB load flat;
  // resolveDishName short-circuits on exact/alias before any broad query.
  const out = [];
  for (const name of list) {
    out.push(await resolveDishName(name, { prisma, candidateLimit }));
  }
  return out;
}

const CREATE_SOURCE = 'menu_canonicalize';

// Clean a free-text line into a Dish display name: drop annotations, trim, and
// title-case lightly. Returns null when the text isn't a plausible dish name
// (fragments, prose, emails) — we never mint junk Dish entities.
function dishNameFromText(text) {
  const stripped = stripAnnotations(text).replace(/\s+/g, ' ').trim();
  if (!stripped) return null;
  if (!foodNameLooksValid(stripped, 'Dish') || isFoodFragment(stripped, 'Dish')) return null;
  return stripped;
}

/**
 * Resolve a dish name, and if it doesn't confidently match an existing canonical
 * Dish, CREATE one (ledger event → Dish entity → alias of the original text).
 * Returns the same shape as resolveDishName plus `created: boolean`.
 *
 * Refuses to create from implausible names (fragments/prose) — those come back
 * resolved:false, created:false so a human can clean the source line.
 */
async function resolveOrCreateDish(rawText, { prisma = getPrisma(), createdBy = 'system', menuContext = null } = {}) {
  const resolved = await resolveDishName(rawText, { prisma });
  if (resolved.resolved || !prisma) return { ...resolved, created: false };

  const dishName = dishNameFromText(rawText);
  if (!dishName) return { ...resolved, created: false };

  // Record provenance in the ledger before mutating the graph (house rule).
  const ledgerEvent = await writeLedgerEvent({
    eventType: 'menu.dish.canonicalized',
    source: CREATE_SOURCE,
    sourceId: `dish:${canonicalName(dishName)}`,
    actorType: 'staff',
    actorId: createdBy,
    payload: { rawText: String(rawText || ''), dishName, menuContext },
  });

  const { entity, created } = await findOrCreateEntity({
    entityType: 'Dish',
    name: dishName,
    properties: { source: CREATE_SOURCE, createdFrom: 'menu', ledgerEventId: ledgerEvent.id },
    status: 'active',
  });
  if (!entity) return { ...resolved, created: false };

  // Alias the original free text so future spellings of this line resolve fast.
  const aliasText = stripAnnotations(rawText).trim();
  if (aliasText && aliasText.toLowerCase() !== dishName.toLowerCase()) {
    await prisma.brainEntityAlias.upsert({
      where: { entityId_alias: { entityId: entity.id, alias: aliasText } },
      update: {},
      create: { entityId: entity.id, alias: aliasText, source: CREATE_SOURCE },
    });
  }

  return {
    query: resolved.query,
    resolved: true,
    created,
    dishEntityId: entity.id,
    name: entity.name,
    confidence: created ? 1.0 : 0.95,
    method: created ? 'created' : 'exact',
    candidates: [],
  };
}

// Batch variant — resolve-or-create each name sequentially (creation must be
// serial so two identical new lines collapse to one entity, not a race).
async function resolveOrCreateDishes(names, { prisma = getPrisma(), createdBy = 'system', menuContext = null } = {}) {
  const list = (Array.isArray(names) ? names : [names]).map((n) => String(n || ''));
  const out = [];
  for (const name of list) {
    out.push(await resolveOrCreateDish(name, { prisma, createdBy, menuContext }));
  }
  return out;
}

module.exports = {
  resolveDishName,
  resolveDishNames,
  resolveOrCreateDish,
  resolveOrCreateDishes,
  // exported for unit tests
  _internals: { tokenize, tokenScore, stripAnnotations, isCanonicalDish, dishNameFromText, STOPWORDS },
};
