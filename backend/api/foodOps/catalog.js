'use strict';

/**
 * Stock catalog, vendor-item mapping, and price evidence.
 *
 * Writes are planned first as plain data (`planPriceBook`, `planVendorLines`)
 * and then applied in one transaction (`applyPlan`). Planning is pure and
 * idempotent: planning the same input against the state it produced yields no
 * changes. Vendor items are never auto-mapped; a person confirms each mapping.
 */

const { z } = require('zod');
const { DIMENSIONS, normalizeText, parsePackText } = require('./units');
const { buildCostContext } = require('./recipeCost');

const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const KINDS = ['raw', 'prep', 'packaging', 'finished'];
const OBSERVATION_SOURCES = ['lb_line', 'receipt_wedge', 'receipt_eastside', 'vendor_invoice'];

const keySchema = z.string().trim().toLowerCase().regex(KEY_PATTERN, 'lowercase letters, digits, - and _ only');

const stockProductInput = z.object({
  key: keySchema,
  name: z.string().trim().min(1),
  kind: z.enum(KINDS).default('raw'),
  dimension: z.enum(DIMENSIONS),
  densityGPerMl: z.number().positive().optional(),
  aliases: z.array(z.string().trim().min(1)).default([]),
  notes: z.string().trim().optional(),
}).strict();

const vendorItemInput = z.object({
  vendor: z.string().trim().min(1),
  localBudgetVendorId: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1),
  packText: z.string().trim().min(1).optional(),
  stock: keySchema.optional(),
  packCostCents: z.number().int().nonnegative().optional(),
  purchasedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional(),
}).strict().refine((row) => row.packCostCents === undefined || row.purchasedAt, {
  message: 'purchasedAt is required with packCostCents',
  path: ['purchasedAt'],
});

const priceBookSchema = z.object({
  stockProducts: z.array(stockProductInput).default([]),
  vendorItems: z.array(vendorItemInput).default([]),
}).strict();

function slug(value) {
  return normalizeText(value).replace(/ /g, '-');
}

function vendorIdentity({ vendor, sku, description }) {
  return `${slug(vendor)}|${sku ? `sku:${normalizeText(sku)}` : `desc:${normalizeText(description)}`}`;
}

function sameValue(a, b) {
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  if (typeof a === 'object' || typeof b === 'object') return Number(a) === Number(b);
  return a === b;
}

function diffFields(existing, desired) {
  const changes = {};
  for (const [field, value] of Object.entries(desired)) {
    if (Array.isArray(value)) {
      if (JSON.stringify(existing[field] || []) !== JSON.stringify(value)) changes[field] = value;
    } else if (!sameValue(existing[field], value)) {
      changes[field] = value;
    }
  }
  return changes;
}

/**
 * Plan a price-book seed.
 *   existing = { stockProducts: [...rows], vendorItems: [...rows], observationKeys: Set<"source|sourceKey"> }
 * Returns { stockProducts, vendorItems, observations, warnings, errors }.
 */
function planPriceBook(rawInput, existing) {
  const input = priceBookSchema.parse(rawInput);
  const plan = {
    stockProducts: { create: [], update: [], unchanged: 0 },
    vendorItems: { create: [], update: [], unchanged: 0 },
    observations: { create: [], existing: 0 },
    warnings: [],
    errors: [],
  };

  const stockByKey = new Map(existing.stockProducts.map((row) => [row.key, row]));
  const knownKeys = new Set(stockByKey.keys());
  const seenStock = new Set();
  for (const row of input.stockProducts) {
    if (seenStock.has(row.key)) {
      plan.errors.push({ type: 'duplicate_stock_key', key: row.key });
      continue;
    }
    seenStock.add(row.key);
    knownKeys.add(row.key);
    const desired = {
      name: row.name,
      kind: row.kind,
      dimension: row.dimension,
      densityGPerMl: row.densityGPerMl ?? null,
      aliases: row.aliases,
      notes: row.notes ?? null,
    };
    const current = stockByKey.get(row.key);
    if (!current) {
      plan.stockProducts.create.push({ key: row.key, ...desired });
      continue;
    }
    if (current.dimension !== desired.dimension) {
      plan.errors.push({ type: 'dimension_change', key: row.key, from: current.dimension, to: desired.dimension });
      continue;
    }
    const changes = diffFields(current, desired);
    if (Object.keys(changes).length) plan.stockProducts.update.push({ key: row.key, data: changes });
    else plan.stockProducts.unchanged += 1;
  }

  const dimensionOf = new Map(existing.stockProducts.map((row) => [row.key, row.dimension]));
  for (const row of input.stockProducts) dimensionOf.set(row.key, row.dimension);

  const itemByIdentity = new Map(existing.vendorItems.map((row) => [row.identityKey, row]));
  const seenIdentity = new Set();
  const pendingLatest = new Map();

  for (const row of input.vendorItems) {
    const identityKey = vendorIdentity({ vendor: row.vendor, sku: row.sku, description: row.description });
    if (seenIdentity.has(identityKey)) {
      plan.errors.push({ type: 'duplicate_vendor_item', identityKey });
      continue;
    }
    seenIdentity.add(identityKey);

    const pack = parsePackText(row.packText ?? row.description);
    if (row.packText && !pack) {
      plan.errors.push({ type: 'unparseable_pack', identityKey, packText: row.packText });
      continue;
    }
    if (row.stock) {
      if (!knownKeys.has(row.stock)) {
        plan.errors.push({ type: 'unknown_stock_product', identityKey, stock: row.stock });
        continue;
      }
      if (!pack) {
        plan.errors.push({ type: 'mapped_without_pack', identityKey, stock: row.stock });
        continue;
      }
      if (pack.dimension !== dimensionOf.get(row.stock)) {
        const density = (existing.stockProducts.find((p) => p.key === row.stock)?.densityGPerMl)
          ?? input.stockProducts.find((p) => p.key === row.stock)?.densityGPerMl;
        const crossable = density && pack.dimension !== 'count' && dimensionOf.get(row.stock) !== 'count';
        if (!crossable) {
          plan.errors.push({ type: 'pack_dimension_mismatch', identityKey, stock: row.stock, packDimension: pack.dimension });
          continue;
        }
      }
    }

    const current = itemByIdentity.get(identityKey);
    const desired = {
      vendorName: row.vendor,
      localBudgetVendorId: row.localBudgetVendorId ?? null,
      vendorSku: row.sku ?? null,
      description: row.description,
      normalizedDescription: normalizeText(row.description),
      packText: pack ? pack.text : null,
      packBaseQuantity: pack ? pack.baseQuantity : null,
      packDimension: pack ? pack.dimension : null,
    };

    let stockKey = null;
    if (row.stock) {
      const currentKey = current?.stockProduct?.key ?? current?.stockProductKey ?? null;
      if (current && current.status === 'ignored') {
        plan.warnings.push({ type: 'ignored_item_not_mapped', identityKey });
      } else if (current && current.status === 'mapped' && currentKey && currentKey !== row.stock) {
        plan.warnings.push({ type: 'mapping_conflict', identityKey, existing: currentKey, requested: row.stock });
      } else {
        stockKey = row.stock;
      }
    }

    // Keep the human-set parts of an existing item unless the seed names them.
    if (current) {
      for (const field of ['localBudgetVendorId', 'vendorSku', 'packText', 'packBaseQuantity', 'packDimension']) {
        if (desired[field] === null) delete desired[field];
      }
    }

    if (row.packCostCents !== undefined) {
      const sourceKey = `${identityKey}|${row.purchasedAt}|${row.packCostCents}`;
      if (existing.observationKeys.has(`manual|${sourceKey}`)) {
        plan.observations.existing += 1;
      } else {
        plan.observations.create.push({ identityKey, source: 'manual', sourceKey, observedAt: row.purchasedAt, packCostCents: row.packCostCents });
        const best = pendingLatest.get(identityKey);
        if (!best || row.purchasedAt >= best.purchasedAt) pendingLatest.set(identityKey, { purchasedAt: row.purchasedAt, packCostCents: row.packCostCents });
      }
    }

    const latest = pendingLatest.get(identityKey);
    const currentLatest = current?.lastPurchasedAt ? new Date(current.lastPurchasedAt).toISOString().slice(0, 10) : null;
    if (latest && (!currentLatest || latest.purchasedAt >= currentLatest)) {
      desired.lastPackCostCents = latest.packCostCents;
      desired.lastPurchasedAt = new Date(`${latest.purchasedAt}T00:00:00.000Z`);
    }

    if (!current) {
      plan.vendorItems.create.push({ identityKey, vendorKey: slug(row.vendor), ...desired, stockKey });
    } else {
      const changes = diffFields(current, desired);
      const mappingChange = stockKey && current.status !== 'mapped';
      if (Object.keys(changes).length || mappingChange) {
        plan.vendorItems.update.push({ identityKey, data: changes, stockKey: mappingChange ? stockKey : null });
      } else {
        plan.vendorItems.unchanged += 1;
      }
    }
  }
  return plan;
}

function planHasWrites(plan) {
  return plan.stockProducts.create.length + plan.stockProducts.update.length
    + plan.vendorItems.create.length + plan.vendorItems.update.length
    + plan.observations.create.length > 0;
}

function summarizePlan(plan) {
  return {
    stockProducts: { create: plan.stockProducts.create.length, update: plan.stockProducts.update.length, unchanged: plan.stockProducts.unchanged },
    vendorItems: { create: plan.vendorItems.create.length, update: plan.vendorItems.update.length, unchanged: plan.vendorItems.unchanged },
    observations: { create: plan.observations.create.length, existing: plan.observations.existing },
    warnings: plan.warnings,
    errors: plan.errors,
  };
}

async function loadExistingState(prisma) {
  const [stockProducts, vendorItems, observations] = await Promise.all([
    prisma.stockProduct.findMany(),
    prisma.vendorItem.findMany({ include: { stockProduct: { select: { key: true } } } }),
    prisma.costObservation.findMany({ select: { source: true, sourceKey: true } }),
  ]);
  return {
    stockProducts,
    vendorItems,
    observationKeys: new Set(observations.map((row) => `${row.source}|${row.sourceKey}`)),
  };
}

/** Apply a plan in one transaction. Refuses a plan that carries errors. */
async function applyPlan(prisma, plan) {
  if (plan.errors.length) {
    const error = new Error(`Plan has ${plan.errors.length} error(s); nothing was written`);
    error.statusCode = 422;
    error.details = plan.errors;
    throw error;
  }
  return prisma.$transaction(async (tx) => {
    for (const data of plan.stockProducts.create) await tx.stockProduct.create({ data });
    for (const { key, data } of plan.stockProducts.update) await tx.stockProduct.update({ where: { key }, data });

    const products = await tx.stockProduct.findMany({ select: { id: true, key: true } });
    const idByKey = new Map(products.map((row) => [row.key, row.id]));

    const mappedFields = (stockKey) => (stockKey ? { status: 'mapped', stockProductId: idByKey.get(stockKey) } : {});
    if (plan.vendorItems.create.length) {
      await tx.vendorItem.createMany({
        data: plan.vendorItems.create.map(({ stockKey, ...data }) => ({ ...data, ...mappedFields(stockKey) })),
      });
    }
    for (const { identityKey, data, stockKey } of plan.vendorItems.update) {
      await tx.vendorItem.update({
        where: { identityKey },
        data: { ...data, ...(stockKey ? { status: 'mapped', stockProductId: idByKey.get(stockKey) } : {}) },
      });
    }

    if (plan.observations.create.length) {
      const items = await tx.vendorItem.findMany({
        where: { identityKey: { in: [...new Set(plan.observations.create.map((row) => row.identityKey))] } },
        select: { id: true, identityKey: true },
      });
      const idByIdentity = new Map(items.map((row) => [row.identityKey, row.id]));
      const rows = plan.observations.create.map(({ identityKey, observedAt, ...rest }) => ({
        ...rest,
        vendorItemId: idByIdentity.get(identityKey),
        observedAt: new Date(`${observedAt}T00:00:00.000Z`),
      }));
      for (let i = 0; i < rows.length; i += 500) {
        await tx.costObservation.createMany({ data: rows.slice(i, i + 500) });
      }
    }
    return summarizePlan(plan);
  }, { timeout: 120000, maxWait: 20000 });
}

/**
 * Plan ingest of vendor purchase lines (e.g. from Local Budget). New vendor
 * items arrive `unmapped`. Lines already ingested (same source key) are
 * skipped. Prices attach to an item only; mapping stays a human decision.
 *   line = { sourceKey, source?, vendor, localBudgetVendorId?, localBudgetItemId?, sku?, description,
 *            packText?, observedAt (YYYY-MM-DD), unitPriceCents?, quantity?, lineTotalCents? }
 * `source` defaults to `lb_line`; receipt parsers pass `receipt_wedge` / `receipt_eastside`
 * (retail register receipts: indicative retail cost, not wholesale pack cost).
 */
function planVendorLines(lines, existing) {
  const plan = {
    stockProducts: { create: [], update: [], unchanged: 0 },
    vendorItems: { create: [], update: [], unchanged: 0 },
    observations: { create: [], existing: 0 },
    warnings: [],
    errors: [],
  };
  const itemByIdentity = new Map(existing.vendorItems.map((row) => [row.identityKey, row]));
  const created = new Map();
  const latest = new Map();
  const pendingKeys = new Set();

  for (const line of lines) {
    const identityKey = vendorIdentity({ vendor: line.vendor, sku: line.sku, description: line.description });
    if (!itemByIdentity.has(identityKey) && !created.has(identityKey)) {
      const pack = line.packText === null ? null : parsePackText(line.packText ?? line.description);
      const item = {
        identityKey,
        vendorKey: slug(line.vendor),
        vendorName: line.vendor,
        localBudgetVendorId: line.localBudgetVendorId ?? null,
        vendorSku: line.sku ?? null,
        description: line.description,
        normalizedDescription: normalizeText(line.description),
        packText: pack ? pack.text : null,
        packBaseQuantity: pack ? pack.baseQuantity : null,
        packDimension: pack ? pack.dimension : null,
        localBudgetItemId: line.localBudgetItemId ?? null,
        stockKey: null,
      };
      created.set(identityKey, item);
      plan.vendorItems.create.push(item);
    }

    if (line.unitPriceCents === undefined || line.unitPriceCents === null) continue;
    const source = line.source ?? 'lb_line';
    if (!OBSERVATION_SOURCES.includes(source)) {
      plan.errors.push({ path: `lines.${line.sourceKey}`, message: `unknown observation source "${source}"` });
      continue;
    }
    const sourceKey = String(line.sourceKey);
    const dedupeKey = `${source}|${sourceKey}`;
    if (existing.observationKeys.has(dedupeKey) || pendingKeys.has(dedupeKey)) {
      plan.observations.existing += 1;
      continue;
    }
    pendingKeys.add(dedupeKey);
    plan.observations.create.push({
      identityKey,
      source,
      sourceKey,
      observedAt: line.observedAt,
      packCostCents: line.unitPriceCents,
      quantity: line.quantity ?? null,
      lineTotalCents: line.lineTotalCents ?? null,
    });
    const best = latest.get(identityKey);
    if (!best || line.observedAt >= best.observedAt) latest.set(identityKey, { observedAt: line.observedAt, packCostCents: line.unitPriceCents });
  }

  for (const [identityKey, best] of latest) {
    const when = new Date(`${best.observedAt}T00:00:00.000Z`);
    const current = itemByIdentity.get(identityKey);
    if (current) {
      const currentTime = current.lastPurchasedAt ? new Date(current.lastPurchasedAt).getTime() : -Infinity;
      if (when.getTime() >= currentTime) {
        plan.vendorItems.update.push({ identityKey, data: { lastPackCostCents: best.packCostCents, lastPurchasedAt: when }, stockKey: null });
      }
    } else {
      const item = created.get(identityKey);
      item.lastPackCostCents = best.packCostCents;
      item.lastPurchasedAt = when;
    }
  }
  return plan;
}

/** Load everything the cost engine needs. */
async function loadCostContext(prisma) {
  const [stockProducts, vendorItems, recipes] = await Promise.all([
    prisma.stockProduct.findMany(),
    prisma.vendorItem.findMany({
      where: { status: 'mapped' },
      include: { costObservations: { select: { observedAt: true, packCostCents: true }, orderBy: { observedAt: 'desc' }, take: 1 } },
    }),
    prisma.recipe.findMany({
      where: { status: 'active' },
      include: { versions: { where: { status: 'active' }, include: { components: true } } },
    }),
  ]);
  const ctx = buildCostContext({
    stockProducts,
    vendorItems: vendorItems.map((item) => ({ ...item, observations: item.costObservations })),
    recipes: recipes.map((recipe) => ({ ...recipe, activeVersion: recipe.versions[0] || null })),
  });
  ctx.vendorItems = vendorItems;
  return ctx;
}

const mapSchema = z.object({
  stockProductKey: keySchema,
  packText: z.string().trim().min(1).optional(),
}).strict();

/**
 * Resolve and validate the pack a mapping would store: from `packText` when
 * supplied, else the item's existing pack. Throws a 422 httpError when the pack
 * is unknown or its dimension cannot be costed against the product.
 */
function resolveMappingPack(item, product, packText) {
  let packBaseQuantity = item.packBaseQuantity;
  let packDimension = item.packDimension;
  let text = item.packText;
  if (packText) {
    const pack = parsePackText(packText);
    if (!pack) throw httpError(422, `could not read a pack size from "${packText}"`);
    packBaseQuantity = pack.baseQuantity;
    packDimension = pack.dimension;
    text = pack.text;
  }
  if (!packBaseQuantity || !packDimension) throw httpError(422, 'pack size is required to map an item; supply packText');
  if (packDimension !== product.dimension) {
    const density = Number(product.densityGPerMl);
    if (!(density > 0) || packDimension === 'count' || product.dimension === 'count') {
      throw httpError(422, `pack is measured in ${packDimension} but the product is ${product.dimension}`);
    }
  }
  return { packBaseQuantity, packDimension, packText: text };
}

/**
 * Confirm a mapping from a vendor item to a stock product. The pack size must
 * be known (parsed from `packText` or already on the item) so cost per base
 * unit is defined.
 */
async function mapVendorItem(prisma, vendorItemId, rawInput, expectedUpdatedAt = null) {
  const input = mapSchema.parse(rawInput);
  const [item, product] = await Promise.all([
    prisma.vendorItem.findUnique({ where: { id: vendorItemId } }),
    prisma.stockProduct.findUnique({ where: { key: input.stockProductKey } }),
  ]);
  if (!item) throw httpError(404, 'vendor item not found');
  if (!product) throw httpError(404, `stock product "${input.stockProductKey}" not found`);

  const pack = resolveMappingPack(item, product, input.packText);
  if (expectedUpdatedAt) {
    if (item.status !== 'unmapped' || item.updatedAt.toISOString() !== expectedUpdatedAt.toISOString()) {
      throw httpError(409, 'vendor item changed');
    }
    const result = await prisma.vendorItem.updateMany({
      where: { id: vendorItemId, status: 'unmapped', updatedAt: expectedUpdatedAt },
      data: { status: 'mapped', stockProductId: product.id, ...pack },
    });
    if (result.count !== 1) throw httpError(409, 'vendor item changed');
    return prisma.vendorItem.findUnique({ where: { id: vendorItemId } });
  }
  return prisma.vendorItem.update({
    where: { id: vendorItemId },
    data: { status: 'mapped', stockProductId: product.id, ...pack },
  });
}

async function ignoreVendorItem(prisma, vendorItemId, expectedUpdatedAt = null) {
  const item = await prisma.vendorItem.findUnique({ where: { id: vendorItemId } });
  if (!item) throw httpError(404, 'vendor item not found');
  if (expectedUpdatedAt) {
    if (item.status !== 'unmapped' || item.updatedAt.toISOString() !== expectedUpdatedAt.toISOString()) {
      throw httpError(409, 'vendor item changed');
    }
    const result = await prisma.vendorItem.updateMany({
      where: { id: vendorItemId, status: 'unmapped', updatedAt: expectedUpdatedAt },
      data: { status: 'ignored', stockProductId: null },
    });
    if (result.count !== 1) throw httpError(409, 'vendor item changed');
    return prisma.vendorItem.findUnique({ where: { id: vendorItemId } });
  }
  return prisma.vendorItem.update({ where: { id: vendorItemId }, data: { status: 'ignored', stockProductId: null } });
}


function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = {
  applyPlan,
  httpError,
  ignoreVendorItem,
  loadCostContext,
  loadExistingState,
  mapVendorItem,
  planHasWrites,
  planPriceBook,
  planVendorLines,
  priceBookSchema,
  resolveMappingPack,
  stockProductInput,
  summarizePlan,
  vendorIdentity,
};
