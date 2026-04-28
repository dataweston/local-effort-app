/**
 * Ingredient / Recipe / Batch ontology helpers.
 *
 * Entity types used:
 *   Ingredient  — a raw input (e.g. "Organic Carrots"). properties: { unit, defaultVendorId? }
 *   Recipe      — versioned formula for a Dish. properties: { dishId?, version, yieldPortions, notes }
 *   Batch       — a production run. properties: { recipeId, madeAt, portionsMade, actualCostCents, notes }
 *
 * Assertions used:
 *   Recipe  -[CONTAINS]->  Ingredient   metadata: { quantity, unit, notes? }
 *   Recipe  -[VERSION_OF]-> Dish        (links to local-effort Dish entity in brain)
 *   Batch   -[REALIZED_IN]-> Recipe
 *   Vendor  -[SUPPLIES]->  Ingredient   metadata: { pricePerUnit, unit, lastPricedAt }
 *   Ingredient -[PRICED_AT]-> Vendor    metadata: { pricePerUnit, unit, currency, effectiveDate }
 *
 * Margin calculation:
 *   Recipe theoretical cost  = Σ (ingredient.quantity × vendor.pricePerUnit)
 *   Batch actual cost        = batch.properties.actualCostCents / portionsMade
 *   Margin                   = (dish.price - portionCost) / dish.price
 */

const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent, canonicalName } = require('./ledger');
const { normalizeRelType, validateRelationship } = require('./relationshipDictionary');

async function createBrainAssertion(prisma, data) {
  const [src, dst] = await Promise.all([
    prisma.brainEntity.findUnique({ where: { id: data.srcId }, select: { id: true, entityType: true } }),
    prisma.brainEntity.findUnique({ where: { id: data.dstId }, select: { id: true, entityType: true } }),
  ]);
  const validation = validateRelationship({
    relType: data.relType,
    srcType: src?.entityType,
    dstType: dst?.entityType,
    srcId: data.srcId,
    dstId: data.dstId,
  });
  return prisma.brainAssertion.create({
    data: {
      ...data,
      relType: normalizeRelType(data.relType),
      metadata: {
        ...(data.metadata || {}),
        ...(validation.warnings.length ? { relationshipWarnings: validation.warnings } : {}),
      },
    },
  });
}

// ── Ingredient helpers ────────────────────────────────────────────────────────

async function createIngredient({ name, unit = 'unit', defaultVendorId = null, createdBy = 'founder' }) {
  const prisma = getPrisma();

  const existing = await prisma.brainEntity.findFirst({
    where: { entityType: 'Ingredient', name: { equals: name, mode: 'insensitive' }, tombstonedAt: null },
  });
  if (existing) return { created: false, entity: existing };

  const entity = await prisma.brainEntity.create({
    data: {
      entityType: 'Ingredient',
      name,
      canonicalName: canonicalName(name),
      status: 'active',
      properties: { unit, defaultVendorId },
    },
  });

  await writeLedgerEvent({
    eventType: 'ingredient.created',
    source: 'admin_ux',
    actorType: createdBy === 'founder' ? 'founder' : 'system',
    payload: { entityId: entity.id, name, unit },
  });

  return { created: true, entity };
}

async function setPricing({ ingredientId, vendorId, pricePerUnit, unit, effectiveDate = null }) {
  const prisma = getPrisma();

  // Supersede any prior PRICED_AT assertion for this ingredient→vendor pair
  const prior = await prisma.brainAssertion.findFirst({
    where: { srcId: ingredientId, dstId: vendorId, relType: 'PRICED_AT', knownUntil: null, retractedAt: null },
  });

  const ledgerEvent = await writeLedgerEvent({
    eventType: 'ingredient.priced',
    source: 'admin_ux',
    actorType: 'founder',
    payload: { ingredientId, vendorId, pricePerUnit, unit, effectiveDate },
  });

  const assertion = await createBrainAssertion(prisma, {
    srcId: ingredientId,
    dstId: vendorId,
    relType: 'PRICED_AT',
    metadata: { pricePerUnit, unit, currency: 'USD', effectiveDate: effectiveDate || new Date().toISOString() },
    validFrom: effectiveDate ? new Date(effectiveDate) : new Date(),
    knownFrom: new Date(),
    confidence: 1.0,
    sourceType: 'ledger_event',
    sourceId: ledgerEvent.id,
    createdBy: 'founder',
  });

  if (prior) {
    await prisma.brainAssertion.update({
      where: { id: prior.id },
      data: { knownUntil: new Date(), supersededBy: assertion.id, supersededAt: new Date() },
    });
  }

  return assertion;
}

// ── Recipe helpers ────────────────────────────────────────────────────────────

/**
 * Create a Recipe entity with its ingredient lines.
 * @param {object} opts
 * @param {string} opts.name
 * @param {string|null} opts.dishEntityId — BrainEntity id of the linked Dish (optional)
 * @param {number} opts.yieldPortions
 * @param {Array<{ingredientId, quantity, unit, notes?}>} opts.lines
 * @param {string} opts.notes
 */
async function createRecipe({ name, dishEntityId = null, yieldPortions = 1, lines = [], notes = '', createdBy = 'founder' }) {
  const prisma = getPrisma();

  // Get current max version for this name
  const prior = await prisma.brainEntity.findMany({
    where: { entityType: 'Recipe', name: { equals: name, mode: 'insensitive' }, tombstonedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { properties: true },
  });
  const version = prior.length > 0 ? ((prior[0].properties?.version || 1) + 1) : 1;

  const recipe = await prisma.brainEntity.create({
    data: {
      entityType: 'Recipe',
      name,
      canonicalName: canonicalName(name),
      status: 'active',
      properties: { version, yieldPortions, notes, dishEntityId },
    },
  });

  // Link to Dish entity
  if (dishEntityId) {
    await createBrainAssertion(prisma, {
      srcId: recipe.id,
      dstId: dishEntityId,
      relType: 'VERSION_OF',
      confidence: 1.0,
      sourceType: 'manual',
      createdBy,
      knownFrom: new Date(),
      validFrom: new Date(),
    });
  }

  // Create CONTAINS assertions for each ingredient line
  for (const line of lines) {
    if (!line.ingredientId) continue;
    await createBrainAssertion(prisma, {
      srcId: recipe.id,
      dstId: line.ingredientId,
      relType: 'CONTAINS',
      metadata: { quantity: line.quantity, unit: line.unit || 'unit', notes: line.notes || null },
      confidence: 1.0,
      sourceType: 'manual',
      createdBy,
      knownFrom: new Date(),
      validFrom: new Date(),
    });
  }

  await writeLedgerEvent({
    eventType: 'recipe.created',
    source: 'admin_ux',
    actorType: 'founder',
    payload: { recipeId: recipe.id, name, version, yieldPortions, lineCount: lines.length },
  });

  return { recipe, version, lineCount: lines.length };
}

// ── Batch helpers ─────────────────────────────────────────────────────────────

async function recordBatch({ recipeId, madeAt = null, portionsMade, actualCostCents, notes = '' }) {
  const prisma = getPrisma();

  const recipe = await prisma.brainEntity.findUnique({ where: { id: recipeId } });
  if (!recipe || recipe.entityType !== 'Recipe') throw new Error('recipe not found');

  const batch = await prisma.brainEntity.create({
    data: {
      entityType: 'Batch',
      name: `${recipe.name} batch ${new Date(madeAt || Date.now()).toISOString().slice(0, 10)}`,
      canonicalName: canonicalName(`${recipe.name} batch ${new Date(madeAt || Date.now()).toISOString().slice(0, 10)}`),
      status: 'active',
      properties: {
        recipeId,
        madeAt: madeAt || new Date().toISOString(),
        portionsMade,
        actualCostCents,
        costPerPortionCents: portionsMade > 0 ? Math.round(actualCostCents / portionsMade) : null,
        notes,
      },
    },
  });

  await createBrainAssertion(prisma, {
    srcId: batch.id,
    dstId: recipeId,
    relType: 'REALIZED_IN',
    confidence: 1.0,
    sourceType: 'manual',
    createdBy: 'founder',
    knownFrom: new Date(),
    validFrom: new Date(madeAt || Date.now()),
  });

  await writeLedgerEvent({
    eventType: 'batch.recorded',
    source: 'admin_ux',
    actorType: 'founder',
    payload: { batchId: batch.id, recipeId, portionsMade, actualCostCents, madeAt: madeAt || new Date().toISOString() },
  });

  return batch;
}

async function createFactNode({
  entityType,
  name,
  properties = {},
  links = [],
  source = 'admin_ux',
  createdBy = 'founder',
}) {
  const prisma = getPrisma();
  const allowedTypes = new Set([
    'Invoice', 'Payment', 'Order', 'Receipt', 'EmailThread',
    'Feedback', 'Decision', 'PriceQuote', 'LedgerTransaction',
  ]);
  if (!allowedTypes.has(entityType)) {
    throw new Error(`entityType ${entityType} is not a promotable fact node type`);
  }
  if (!name || typeof name !== 'string') {
    throw new Error('name is required');
  }

  const ledgerEvent = await writeLedgerEvent({
    eventType: 'fact.promoted',
    source,
    actorType: createdBy === 'founder' ? 'founder' : 'system',
    payload: { entityType, name, properties, links },
  });

  const fact = await prisma.brainEntity.create({
    data: {
      entityType,
      name: name.trim(),
      canonicalName: canonicalName(name),
      status: 'active',
      properties: { ...properties, promotedFrom: source },
    },
  });

  const assertions = [];
  for (const link of links) {
    if (!link?.relType || !link?.dstId) continue;
    const assertion = await createBrainAssertion(prisma, {
      srcId: link.srcId || fact.id,
      dstId: link.dstId,
      relType: link.relType,
      confidence: Number(link.confidence ?? 1),
      metadata: {
        ...(link.metadata || {}),
        promotedFactNodeId: fact.id,
      },
      sourceType: 'ledger_event',
      sourceId: ledgerEvent.id,
      createdBy,
      knownFrom: new Date(),
      validFrom: link.validFrom ? new Date(link.validFrom) : new Date(),
      provisional: !!link.provisional,
    });
    assertions.push(assertion);
  }

  return { fact, assertions, ledgerEventId: ledgerEvent.id };
}

// ── Margin calculator ─────────────────────────────────────────────────────────

/**
 * Compute theoretical cost for a recipe from current ingredient pricing.
 * Returns per-portion cost in cents.
 */
async function computeRecipeCost(recipeId) {
  const prisma = getPrisma();

  const lines = await prisma.brainAssertion.findMany({
    where: { srcId: recipeId, relType: 'CONTAINS', retractedAt: null, knownUntil: null },
    include: { dst: { select: { id: true, name: true, properties: true } } },
  });

  const recipe = await prisma.brainEntity.findUnique({ where: { id: recipeId } });
  const yieldPortions = recipe?.properties?.yieldPortions || 1;

  let theoreticalCostCents = 0;
  const lineDetails = [];

  for (const line of lines) {
    const ingredientId = line.dstId;
    const quantity = line.metadata?.quantity || 0;
    const unit = line.metadata?.unit || 'unit';

    // Get current price for this ingredient
    const pricing = await prisma.brainAssertion.findFirst({
      where: { srcId: ingredientId, relType: 'PRICED_AT', retractedAt: null, knownUntil: null },
      orderBy: { validFrom: 'desc' },
      include: { dst: { select: { name: true } } },
    });

    const pricePerUnit = pricing?.metadata?.pricePerUnit || null;
    const lineCost = pricePerUnit ? Math.round(quantity * pricePerUnit * 100) : null;

    lineDetails.push({
      ingredient: line.dst?.name,
      ingredientId,
      quantity,
      unit,
      pricePerUnit,
      lineCostCents: lineCost,
      vendor: pricing?.dst?.name || null,
      priced: pricePerUnit !== null,
    });

    if (lineCost !== null) theoreticalCostCents += lineCost;
  }

  const unpricedLines = lineDetails.filter(l => !l.priced);
  const costPerPortionCents = yieldPortions > 0 ? Math.round(theoreticalCostCents / yieldPortions) : null;

  return {
    recipeId,
    recipeName: recipe?.name,
    yieldPortions,
    theoreticalCostCents,
    costPerPortionCents,
    costPerPortionDollars: costPerPortionCents ? (costPerPortionCents / 100).toFixed(2) : null,
    lineDetails,
    unpricedIngredients: unpricedLines.map(l => l.ingredient),
    pricingComplete: unpricedLines.length === 0,
  };
}

/**
 * Compute margin for a dish: (sellingPriceCents - costPerPortionCents) / sellingPriceCents
 * dishEntityId is the BrainEntity id for the Dish.
 * sellingPriceCents comes from dish.properties.priceCents (founder sets this).
 */
async function computeDishMargin(dishEntityId) {
  const prisma = getPrisma();

  const dish = await prisma.brainEntity.findUnique({ where: { id: dishEntityId } });
  if (!dish) throw new Error('dish entity not found');

  const sellingPriceCents = dish.properties?.priceCents || null;

  // Find most recent active recipe for this dish
  const recipeAssert = await prisma.brainAssertion.findFirst({
    where: { dstId: dishEntityId, relType: 'VERSION_OF', retractedAt: null, knownUntil: null },
    orderBy: { validFrom: 'desc' },
    select: { srcId: true },
  });

  if (!recipeAssert) {
    return { dishEntityId, dishName: dish.name, error: 'no recipe linked', sellingPriceCents };
  }

  const costResult = await computeRecipeCost(recipeAssert.srcId);

  // Also check recent batches for actual cost
  const recentBatch = await prisma.brainEntity.findFirst({
    where: {
      entityType: 'Batch',
      tombstonedAt: null,
      properties: { path: ['recipeId'], equals: recipeAssert.srcId },
    },
    orderBy: { createdAt: 'desc' },
    select: { properties: true, createdAt: true },
  });

  const actualCostPerPortionCents = recentBatch?.properties?.costPerPortionCents || null;
  const effectiveCost = actualCostPerPortionCents ?? costResult.costPerPortionCents;

  let marginPct = null;
  if (sellingPriceCents && effectiveCost) {
    marginPct = Math.round(((sellingPriceCents - effectiveCost) / sellingPriceCents) * 100);
  }

  return {
    dishEntityId,
    dishName: dish.name,
    sellingPriceCents,
    sellingPriceDollars: sellingPriceCents ? (sellingPriceCents / 100).toFixed(2) : null,
    theoreticalCostPerPortionCents: costResult.costPerPortionCents,
    actualCostPerPortionCents,
    effectiveCostPerPortionCents: effectiveCost,
    effectiveCostDollars: effectiveCost ? (effectiveCost / 100).toFixed(2) : null,
    marginPct,
    marginFlag: marginPct === null ? 'unknown' : marginPct < 30 ? 'low' : marginPct < 60 ? 'ok' : 'good',
    pricingComplete: costResult.pricingComplete,
    unpricedIngredients: costResult.unpricedIngredients,
    costSource: actualCostPerPortionCents ? 'batch' : 'theoretical',
  };
}

module.exports = {
  createIngredient,
  setPricing,
  createRecipe,
  recordBatch,
  createFactNode,
  computeRecipeCost,
  computeDishMargin,
};
