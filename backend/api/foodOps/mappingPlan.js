'use strict';

/**
 * Bulk vendor-item mapping from proposal files (one per vendor).
 *
 *   mappingFileSchema   shape of a proposal file
 *   planMappings        pure: files + current DB state -> plan (dry run)
 *   applyMappingPlan    writes a plan in one transaction
 *
 * A row that cannot be applied (bad pack, unknown item, owner already decided)
 * is SKIPPED with a reason so one bad row never blocks the rest. Only
 * conflicts that make the whole input ambiguous are plan ERRORS and block apply.
 */

const { z } = require('zod');
const { httpError, resolveMappingPack, stockProductInput } = require('./catalog');

const CONFIDENCE_ACCEPTED = new Set(['high', 'medium']);
const PACK_PRECISION = 1e6; // VendorItem.packBaseQuantity is DECIMAL(18,6)

const identityKey = z.string().trim().min(1);

// Row schemas strip unknown keys (mappers attach notes the plan does not need);
// the file and stock product shapes stay strict.
const mappingFileSchema = z.object({
  stockProducts: z.array(stockProductInput).default([]),
  mappings: z.array(z.object({
    identityKey,
    stockKey: stockProductInput.shape.key,
    packText: z.string().trim().min(1).optional(),
    confidence: z.string().trim().toLowerCase(),
    why: z.string().optional(),
  })).default([]),
  ignore: z.array(z.object({ identityKey, reason: z.string().optional() })).default([]),
  review: z.array(z.object({
    identityKey,
    description: z.string().optional(),
    question: z.string().optional(),
  })).default([]),
  stats: z.record(z.string(), z.unknown()).default({}),
}).strict();

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const round = (value) => Math.round(Number(value) * PACK_PRECISION);
const densityOf = (value) => (value === null || value === undefined ? null : round(value));

function describeProduct(product) {
  const density = product.densityGPerMl === null || product.densityGPerMl === undefined ? 'none' : Number(product.densityGPerMl);
  return `dimension=${product.dimension}, density=${density}`;
}

function sameProduct(a, b) {
  return a.dimension === b.dimension && densityOf(a.densityGPerMl) === densityOf(b.densityGPerMl);
}

function issueText(issues) {
  const shown = issues.slice(0, 5).map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
  return issues.length > 5 ? `${shown.join('; ')}; +${issues.length - 5} more` : shown.join('; ');
}

/**
 * files: parsed (or parseable) mapping files. options.names labels them in messages.
 * state: { stockProducts: [{id,key,dimension,densityGPerMl}],
 *          vendorItems: [{id,identityKey,status,packBaseQuantity,packDimension,packText,stockProductId}] }
 */
function planMappings(files, state, options = {}) {
  const names = options.names || [];
  const plan = {
    stockProducts: { create: [], existing: 0 },
    mappings: { create: [], unchanged: 0 },
    ignore: { create: [], unchanged: 0 },
    skipped: [],
    review: 0,
    errors: [],
    warnings: [],
  };
  const skip = (identity, reason) => plan.skipped.push({ identityKey: identity, reason });

  const parsed = [];
  files.forEach((file, index) => {
    const label = names[index] || `file ${index + 1}`;
    const result = mappingFileSchema.safeParse(file);
    if (result.success) parsed.push({ label, data: result.data });
    else plan.errors.push(`${label}: invalid mapping file (${issueText(result.error.issues)})`);
  });

  const productsById = new Map(state.stockProducts.map((row) => [row.id, row]));
  const existingByKey = new Map(state.stockProducts.map((row) => [row.key, row]));
  const itemsByIdentity = new Map(state.vendorItems.map((row) => [row.identityKey, row]));

  // Stock products: merge across files (first wins), then compare with the database.
  const declared = new Map();
  for (const { label, data } of parsed) {
    for (const product of data.stockProducts) {
      const first = declared.get(product.key);
      if (!first) {
        declared.set(product.key, { label, product });
      } else if (first.product.kind !== product.kind || !sameProduct(first.product, product)) {
        plan.errors.push(
          `stock product "${product.key}" conflicts: ${first.label} has kind=${first.product.kind}, ${describeProduct(first.product)}; `
          + `${label} has kind=${product.kind}, ${describeProduct(product)}`,
        );
      }
    }
  }
  const productByKey = new Map(existingByKey);
  for (const key of [...declared.keys()].sort(compare)) {
    const { label, product } = declared.get(key);
    const existing = existingByKey.get(key);
    if (!existing) {
      plan.stockProducts.create.push(product);
      productByKey.set(key, product);
    } else if (sameProduct(existing, product)) {
      plan.stockProducts.existing += 1;
    } else {
      plan.errors.push(`stock product "${key}" in ${label} differs from the database: file ${describeProduct(product)}; database ${describeProduct(existing)}`);
    }
  }

  // Mappings and ignores: dedupe across files, detect contradictions.
  const mappingByItem = new Map();
  const ignoreByItem = new Map();
  const reviewKeys = new Set();
  for (const { label, data } of parsed) {
    for (const row of data.mappings) {
      const first = mappingByItem.get(row.identityKey);
      if (!first) mappingByItem.set(row.identityKey, { label, row });
      else if (first.row.stockKey !== row.stockKey) {
        plan.errors.push(`"${row.identityKey}" is mapped to "${first.row.stockKey}" in ${first.label} and "${row.stockKey}" in ${label}`);
      }
    }
    for (const row of data.ignore) {
      if (!ignoreByItem.has(row.identityKey)) ignoreByItem.set(row.identityKey, { label, row });
    }
    for (const row of data.review) reviewKeys.add(row.identityKey);
  }
  const contradicted = new Set();
  for (const [identity, { label }] of ignoreByItem) {
    const mapped = mappingByItem.get(identity);
    if (!mapped) continue;
    contradicted.add(identity);
    plan.errors.push(`"${identity}" is mapped to "${mapped.row.stockKey}" in ${mapped.label} but ignored in ${label}`);
  }
  plan.review = reviewKeys.size;

  for (const identity of [...mappingByItem.keys()].sort(compare)) {
    if (contradicted.has(identity)) continue;
    const { row } = mappingByItem.get(identity);
    if (!CONFIDENCE_ACCEPTED.has(row.confidence)) {
      skip(identity, `confidence "${row.confidence}" is not high or medium`);
      continue;
    }
    const item = itemsByIdentity.get(identity);
    if (!item) {
      skip(identity, 'unknown vendor item');
      continue;
    }
    const product = productByKey.get(row.stockKey);
    if (!product) {
      skip(identity, `unknown stock product "${row.stockKey}"`);
      continue;
    }
    if (item.status === 'ignored') {
      skip(identity, 'already ignored');
      continue;
    }
    const mappedTo = item.status === 'mapped' ? productsById.get(item.stockProductId) : null;
    if (item.status === 'mapped' && mappedTo?.key !== row.stockKey) {
      skip(identity, `already mapped to ${mappedTo ? mappedTo.key : item.stockProductId}`);
      continue;
    }
    let pack;
    try {
      pack = resolveMappingPack(item, product, row.packText);
    } catch (error) {
      skip(identity, error.message);
      continue;
    }
    if (item.status === 'mapped') {
      const same = pack.packDimension === item.packDimension && round(pack.packBaseQuantity) === round(item.packBaseQuantity);
      if (same) plan.mappings.unchanged += 1;
      else skip(identity, `already mapped to ${row.stockKey} with a different pack (${item.packText || item.packBaseQuantity})`);
      continue;
    }
    plan.mappings.create.push({
      identityKey: identity,
      stockKey: row.stockKey,
      ...(row.packText ? { packText: row.packText } : {}),
      pack: { baseQuantity: Number(pack.packBaseQuantity), dimension: pack.packDimension, text: pack.packText ?? null },
    });
  }

  for (const identity of [...ignoreByItem.keys()].sort(compare)) {
    if (contradicted.has(identity)) continue;
    const item = itemsByIdentity.get(identity);
    if (!item) skip(identity, 'unknown vendor item');
    else if (item.status === 'ignored') plan.ignore.unchanged += 1;
    else if (item.status === 'mapped') skip(identity, `already mapped to ${productsById.get(item.stockProductId)?.key ?? item.stockProductId}`);
    else plan.ignore.create.push(identity);
  }

  plan.skipped.sort((a, b) => compare(a.identityKey, b.identityKey) || compare(a.reason, b.reason));
  return plan;
}

/** Counts plus skipped grouped by reason (up to `examples` identityKeys each). */
function summarizeMappingPlan(plan, examples = 5) {
  const byReason = new Map();
  for (const { identityKey: identity, reason } of plan.skipped) {
    if (!byReason.has(reason)) byReason.set(reason, { reason, count: 0, examples: [] });
    const group = byReason.get(reason);
    group.count += 1;
    if (group.examples.length < examples) group.examples.push(identity);
  }
  return {
    stockProducts: { create: plan.stockProducts.create.length, existing: plan.stockProducts.existing },
    mappings: { create: plan.mappings.create.length, unchanged: plan.mappings.unchanged },
    ignore: { create: plan.ignore.create.length, unchanged: plan.ignore.unchanged },
    skipped: { total: plan.skipped.length, byReason: [...byReason.values()].sort((a, b) => b.count - a.count || compare(a.reason, b.reason)) },
    review: plan.review,
    warnings: plan.warnings,
    errors: plan.errors,
  };
}

/** Read-only: only the fields planMappings needs. */
async function loadMappingState(prisma) {
  const [stockProducts, vendorItems] = await Promise.all([
    prisma.stockProduct.findMany({ select: { id: true, key: true, dimension: true, densityGPerMl: true } }),
    prisma.vendorItem.findMany({
      select: { id: true, identityKey: true, status: true, packBaseQuantity: true, packDimension: true, packText: true, stockProductId: true },
    }),
  ]);
  return { stockProducts, vendorItems };
}

function expectUpdated(result, expected, what) {
  if (result.count !== expected) {
    throw httpError(409, `${what}: expected to update ${expected} vendor item(s) but updated ${result.count}; the catalog changed since the plan was made. Nothing was written.`);
  }
}

/**
 * Apply a plan in ONE transaction. Refuses a plan that carries errors.
 * Mappings are grouped into one updateMany per (stock product, pack): an
 * interactive transaction runs on a single connection, so round trips, not
 * concurrency, set the runtime. Items with no supplied packText keep their
 * stored pack and share one statement per stock product.
 */
async function applyMappingPlan(prisma, plan) {
  if (plan.errors.length) {
    const error = new Error(`Plan has ${plan.errors.length} error(s); nothing was written`);
    error.statusCode = 422;
    error.details = plan.errors;
    throw error;
  }
  return prisma.$transaction(async (tx) => {
    if (plan.stockProducts.create.length) {
      await tx.stockProduct.createMany({ data: plan.stockProducts.create });
    }
    const products = await tx.stockProduct.findMany({ select: { id: true, key: true } });
    const idByKey = new Map(products.map((row) => [row.key, row.id]));

    const groups = new Map();
    for (const { identityKey: identity, stockKey, packText, pack } of plan.mappings.create) {
      const key = JSON.stringify(packText ? [stockKey, pack.baseQuantity, pack.dimension, pack.text] : [stockKey]);
      if (!groups.has(key)) groups.set(key, { stockKey, withPack: Boolean(packText), pack, identities: [] });
      groups.get(key).identities.push(identity);
    }
    let statements = 0;
    for (const { stockKey, withPack, pack, identities } of groups.values()) {
      const stockProductId = idByKey.get(stockKey);
      if (!stockProductId) throw httpError(409, `stock product "${stockKey}" does not exist; nothing was written`);
      const data = { status: 'mapped', stockProductId };
      if (withPack) Object.assign(data, { packBaseQuantity: pack.baseQuantity, packDimension: pack.dimension, packText: pack.text });
      const result = await tx.vendorItem.updateMany({ where: { identityKey: { in: identities }, status: 'unmapped' }, data });
      expectUpdated(result, identities.length, `mapping to "${stockKey}"`);
      statements += 1;
    }
    if (plan.ignore.create.length) {
      const result = await tx.vendorItem.updateMany({
        where: { identityKey: { in: plan.ignore.create }, status: 'unmapped' },
        data: { status: 'ignored', stockProductId: null },
      });
      expectUpdated(result, plan.ignore.create.length, 'ignore');
      statements += 1;
    }
    return {
      stockProductsCreated: plan.stockProducts.create.length,
      mapped: plan.mappings.create.length,
      ignored: plan.ignore.create.length,
      updateStatements: statements,
    };
  }, { timeout: 120000, maxWait: 20000 });
}

module.exports = { applyMappingPlan, loadMappingState, mappingFileSchema, planMappings, summarizeMappingPlan };
