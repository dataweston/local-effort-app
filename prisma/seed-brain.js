/**
 * Company Brain seeder — three phases:
 *   Phase 1: Extract and normalize entities from both databases
 *   Phase 2: Apply merge rules, detect alias candidates
 *   Phase 3: Write to BrainEntity/BrainEntityAlias/BrainSeedReview + LedgerEvents
 *
 * Run: node prisma/seed-brain.js
 * Run dry: node prisma/seed-brain.js --dry-run
 * Run a specific phase: node prisma/seed-brain.js --phase=1
 */

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const DRY_RUN = process.argv.includes('--dry-run');
const PHASE_ARG = process.argv.find(a => a.startsWith('--phase='));
const ONLY_PHASE = PHASE_ARG ? parseInt(PHASE_ARG.split('=')[1]) : null;

// ── Database clients ────────────────────────────────────────────────────────

const localEffort = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// Local Budget is consumed through its integration API; do not read its .env or database directly.
function localBudgetConfig() {
  const baseUrl = process.env.LOCAL_BUDGET_API_URL;
  const token = process.env.LOCAL_BUDGET_API_TOKEN;
  if (!baseUrl || !token) {
    throw new Error('LOCAL_BUDGET_API_URL and LOCAL_BUDGET_API_TOKEN are required');
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), token };
}

async function fetchLocalBudget(pathname, params = {}) {
  const { baseUrl, token } = localBudgetConfig();
  const url = new URL(`${baseUrl}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Local Budget API ${response.status} for ${url.pathname}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

// ── Normalization ────────────────────────────────────────────────────────────

function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^debit card\s+/i, '')
    .replace(/^direct payment\s+/i, '')
    .replace(/^sq\s*\*/i, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein-based similarity 0–1
function similarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const la = a.length, lb = b.length;
  const dp = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la; i++)
    for (let j = 1; j <= lb; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return 1 - dp[la][lb] / Math.max(la, lb);
}

// ── Known vendor aliases (manual mappings for obvious duplicates) ────────────

const KNOWN_ALIASES = {
  'eastside food cooperative': ['eastside food cooperati', 'eastside food c', 'eastside food co'],
  "clancey's meats and fish": ["clanceys", "clancey's", "sq clanceys"],
  'costco': ['costco whse #0377', 'costco whse #0652', 'costco whse'],
  'amazon': ['amazon marketplace', 'amazon retail', 'debit card amazon marketplace', 'debit card amazon retail'],
  'facebook ads': ['facebk', 'meta ads'],
  'linden hills co-op': ['linden hills co op', 'linden hills co-op'],
  'meadowlark mill': ['meadowlark organics'],
  'jesco services': ['jesco services inc', 'sq jesco services inc'],
  'speedway': ['speedway 756 n snelli'],
  'godaddy': ['dnh godaddy'],
  'walmart': ['wal-mart #3404', 'wal-mart 1960 twin la', 'wal mart'],
};

// Build reverse lookup: alias → canonical
const ALIAS_TO_CANONICAL = {};
for (const [canonical, aliases] of Object.entries(KNOWN_ALIASES)) {
  for (const alias of aliases) ALIAS_TO_CANONICAL[normalizeName(alias)] = canonical;
}

// Vendors to skip — noise, not food business relevant for the brain
const SKIP_VENDORS = new Set([
  'gas stations', '76 gas stations', 'bp', 'shell', 'speedway', 'marathon',
  'marathon petroleum', 'circle k', 'holiday stations stores', 'kwik trip',
  'loves travel stops', 'sunnymead fuel', 'medicine lake gas', 'dayton gas',
  'prime oil gas', 'pump n munch', 'arco', 'pilot',
  'facebook ads', 'facebk', 'google ads',
  'venmo', 'zelle', 'square loan repayment', 'capital one',
  'comcast', 'comcast cable', 't-mobile',
  'carmax', 'car max auto finance',
  'spotify', 'hulu', 'grubhub', 'prime video channels',
  'now wifi pass',
  'waste management', 'curbside waste',
  'psi exams', 'ce shop real estate',
]);

function shouldSkipVendor(normalizedName) {
  for (const skip of SKIP_VENDORS) {
    if (normalizedName.includes(skip)) return true;
  }
  return false;
}

// ── Phase 1: Extract ─────────────────────────────────────────────────────────

async function phase1Extract() {
  console.log('\n── Phase 1: Extracting entities ──────────────────────────────');

  // Customers from local-effort-app
  const leCustomers = await localEffort.customer.findMany({
    include: { profile: true, users: true },
  });
  console.log(`  local-effort customers: ${leCustomers.length}`);

  // Dishes from local-effort-app
  const leDishes = await localEffort.dish.findMany();
  console.log(`  local-effort dishes: ${leDishes.length}`);

  // Orders from local-effort-app
  const leOrders = await localEffort.order.findMany({
    include: { items: true },
  });
  console.log(`  local-effort orders: ${leOrders.length}`);

  // MenuWeeks from local-effort-app
  const leMenuWeeks = await localEffort.menuWeek.findMany();
  console.log(`  local-effort menuWeeks: ${leMenuWeeks.length}`);

  // Vendor rollups from Local Budget — COGS and OPERATING only by default.
  const lbVendorResponse = await fetchLocalBudget('/api/integration/v1/vendors');
  const lbVendors = lbVendorResponse.vendors || [];
  const lbTxCount = lbVendors.reduce((sum, vendor) => sum + Number(vendor.txCount || 0), 0);
  console.log(`  local-budget COGS/OPERATING vendor rollups: ${lbVendors.length} vendors, ${lbTxCount} txns`);

  // Extract distinct vendor candidates from merchant names
  const vendorMap = new Map(); // normalizedName → { canonical, rawNames, txCount, totalSpend, firstSeen, lastSeen, classification }
  for (const apiVendor of lbVendors) {
    const raw = apiVendor.name;
    const normalized = normalizeName(apiVendor.normalizedName || raw);
    if (!normalized || normalized.length < 3) continue;
    if (shouldSkipVendor(normalized)) continue;

    // Resolve to canonical name
    const canonical = ALIAS_TO_CANONICAL[normalized] || normalized;

    if (!vendorMap.has(canonical)) {
      vendorMap.set(canonical, {
        canonical,
        rawNames: new Set(),
        txCount: 0,
        totalSpend: 0,
        firstSeen: new Date(apiVendor.firstSeen),
        lastSeen: new Date(apiVendor.lastSeen),
        primaryClassification: apiVendor.primaryClassification,
      });
    }
    const v = vendorMap.get(canonical);
    for (const rawName of (apiVendor.rawNames || [raw])) v.rawNames.add(rawName);
    v.txCount += Number(apiVendor.txCount || 0);
    v.totalSpend += Number(apiVendor.totalSpend || 0);
    const firstSeen = new Date(apiVendor.firstSeen);
    const lastSeen = new Date(apiVendor.lastSeen);
    if (firstSeen < v.firstSeen) v.firstSeen = firstSeen;
    if (lastSeen > v.lastSeen) v.lastSeen = lastSeen;
    // Prefer COGS classification
    if (apiVendor.primaryClassification === 'COGS') v.primaryClassification = 'COGS';
  }

  // Convert to array, sort by spend descending
  const vendors = Array.from(vendorMap.values())
    .map(v => ({ ...v, rawNames: Array.from(v.rawNames) }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  console.log(`  extracted vendor candidates: ${vendors.length}`);
  console.log(`  top 10 by spend:`);
  vendors.slice(0, 10).forEach(v =>
    console.log(`    $${v.totalSpend.toFixed(0).padStart(6)} ${v.canonical} (${v.txCount} txns, ${v.primaryClassification})`)
  );

  return { leCustomers, leDishes, leOrders, leMenuWeeks, vendors };
}

// ── Phase 2: Merge rules ─────────────────────────────────────────────────────

async function phase2Merge(extracted) {
  console.log('\n── Phase 2: Applying merge rules ─────────────────────────────');

  const { leCustomers, leDishes, leOrders, leMenuWeeks, vendors } = extracted;

  // Check for existing brain entities to avoid re-seeding
  const existingCount = await localEffort.brainEntity.count();
  if (existingCount > 0) {
    console.log(`  WARNING: ${existingCount} BrainEntity rows already exist.`);
    console.log('  Re-running seed will create duplicates. Clear brain tables first or skip.');
    if (!DRY_RUN) {
      console.log('  Aborting. Run with --dry-run to preview or clear BrainEntity first.');
      process.exit(1);
    }
  }

  // Fuzzy-match vendors against each other to find remaining aliases
  const mergeReviews = [];
  const vendorNames = vendors.map(v => v.canonical);
  for (let i = 0; i < vendorNames.length; i++) {
    for (let j = i + 1; j < vendorNames.length; j++) {
      const score = similarity(vendorNames[i], vendorNames[j]);
      if (score > 0.75 && score < 1.0) {
        mergeReviews.push({
          nameA: vendorNames[i],
          nameB: vendorNames[j],
          score,
        });
      }
    }
  }
  console.log(`  fuzzy merge candidates (score > 0.75): ${mergeReviews.length}`);
  mergeReviews.slice(0, 10).forEach(m =>
    console.log(`    ${m.score.toFixed(2)} "${m.nameA}" ↔ "${m.nameB}"`)
  );

  return { ...extracted, mergeReviews };
}

// ── Phase 3: Write ───────────────────────────────────────────────────────────

async function phase3Write(data) {
  console.log('\n── Phase 3: Writing to brain tables ──────────────────────────');

  const { leCustomers, leDishes, leOrders, leMenuWeeks, vendors, mergeReviews } = data;
  const now = new Date();

  if (DRY_RUN) {
    console.log('  DRY RUN — no writes will occur');
    console.log(`  Would create:`);
    console.log(`    ${vendors.length} Vendor entities`);
    console.log(`    ${leCustomers.length} Customer entities`);
    console.log(`    ${leDishes.length} Dish entities`);
    console.log(`    ${leMenuWeeks.length} Week entities (from MenuWeeks)`);
    console.log(`    ${leOrders.length} Order ledger events`);
    console.log(`    ${mergeReviews.length} BrainSeedReview rows`);
    return;
  }

  // Register ledger event schemas
  console.log('  Registering ledger event schemas...');
  const schemas = [
    { eventType: 'vendor.seeded', version: 1, schema: { type: 'object', properties: { vendorName: { type: 'string' }, totalSpend: { type: 'number' }, txCount: { type: 'integer' }, classification: { type: 'string' } } } },
    { eventType: 'customer.seeded', version: 1, schema: { type: 'object', properties: { customerId: { type: 'string' }, slug: { type: 'string' } } } },
    { eventType: 'dish.seeded', version: 1, schema: { type: 'object', properties: { dishId: { type: 'string' }, title: { type: 'string' }, categories: { type: 'array' } } } },
    { eventType: 'order.seeded', version: 1, schema: { type: 'object', properties: { orderId: { type: 'string' }, customerId: { type: 'string' }, status: { type: 'string' }, totalsCents: { type: 'integer' } } } },
    { eventType: 'menuweek.seeded', version: 1, schema: { type: 'object', properties: { menuWeekId: { type: 'string' }, weekStart: { type: 'string' } } } },
  ];
  for (const s of schemas) {
    await localEffort.ledgerEventSchema.upsert({
      where: { eventType_version: { eventType: s.eventType, version: s.version } },
      update: {},
      create: s,
    });
  }

  // ── Write Vendors ──
  console.log(`  Writing ${vendors.length} Vendor entities...`);
  const vendorEntityMap = new Map(); // canonical name → BrainEntity.id

  for (const vendor of vendors) {
    const entityId = randomUUID();
    const ledgerEventId = randomUUID();

    // LedgerEvent first
    await localEffort.ledgerEvent.create({
      data: {
        id: ledgerEventId,
        eventType: 'vendor.seeded',
        schemaVersion: 1,
        occurredAt: vendor.firstSeen,
        source: 'local-budget',
        actorType: 'system',
        payload: {
          vendorName: vendor.canonical,
          rawNames: vendor.rawNames,
          totalSpend: vendor.totalSpend,
          txCount: vendor.txCount,
          classification: vendor.primaryClassification,
          firstSeen: vendor.firstSeen,
          lastSeen: vendor.lastSeen,
        },
      },
    });

    // BrainEntity
    await localEffort.brainEntity.create({
      data: {
        id: entityId,
        entityType: 'Vendor',
        name: vendor.canonical
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        properties: {
          totalSpend: Math.round(vendor.totalSpend),
          txCount: vendor.txCount,
          primaryClassification: vendor.primaryClassification,
          firstSeen: vendor.firstSeen,
          lastSeen: vendor.lastSeen,
        },
        status: 'active',
      },
    });

    vendorEntityMap.set(vendor.canonical, entityId);

    // Aliases for variant names
    for (const rawName of vendor.rawNames) {
      const normalized = normalizeName(rawName);
      if (normalized !== vendor.canonical) {
        await localEffort.brainEntityAlias.upsert({
          where: { entityId_alias: { entityId, alias: rawName } },
          update: {},
          create: { entityId, alias: rawName, source: 'local-budget' },
        });
      }
    }
  }
  console.log(`  ✓ ${vendors.length} Vendor entities written`);

  // ── Write Customers ──
  console.log(`  Writing ${leCustomers.length} Customer entities...`);
  const customerEntityMap = new Map(); // Customer.id → BrainEntity.id

  for (const customer of leCustomers) {
    const entityId = randomUUID();
    const ledgerEventId = randomUUID();

    await localEffort.ledgerEvent.create({
      data: {
        id: ledgerEventId,
        eventType: 'customer.seeded',
        schemaVersion: 1,
        occurredAt: customer.createdAt,
        source: 'local-effort',
        sourceId: customer.id,
        actorType: 'system',
        payload: {
          customerId: customer.id,
          slug: customer.slug,
          name: customer.name,
          priceTierDefault: customer.priceTierDefault,
        },
      },
    });

    await localEffort.brainEntity.create({
      data: {
        id: entityId,
        entityType: 'Customer',
        name: customer.name || customer.slug,
        properties: {
          slug: customer.slug,
          priceTierDefault: customer.priceTierDefault,
          phone: customer.profile?.phone ?? null,
          address: customer.profile?.address ?? null,
          householdSize: customer.profile?.householdSize ?? null,
        },
        status: 'active',
        localEffortCustomerId: customer.id,
      },
    });

    customerEntityMap.set(customer.id, entityId);
  }
  console.log(`  ✓ ${leCustomers.length} Customer entities written`);

  // ── Write Dishes ──
  console.log(`  Writing ${leDishes.length} Dish entities...`);
  const dishEntityMap = new Map(); // Dish.id → BrainEntity.id

  for (const dish of leDishes) {
    const entityId = randomUUID();

    await localEffort.ledgerEvent.create({
      data: {
        eventType: 'dish.seeded',
        schemaVersion: 1,
        occurredAt: dish.createdAt,
        source: 'local-effort',
        sourceId: dish.id,
        actorType: 'system',
        payload: {
          dishId: dish.id,
          title: dish.title,
          categories: dish.categories,
          tags: dish.tags,
          allergens: dish.allergens,
          status: dish.status,
        },
      },
    });

    await localEffort.brainEntity.create({
      data: {
        id: entityId,
        entityType: 'Dish',
        name: dish.title,
        properties: {
          categories: dish.categories,
          tags: dish.tags,
          allergens: dish.allergens,
          status: dish.status,
          description: dish.description,
        },
        status: dish.status === 'archived' ? 'archived' : 'active',
        localEffortDishId: dish.id,
      },
    });

    dishEntityMap.set(dish.id, entityId);
  }
  console.log(`  ✓ ${leDishes.length} Dish entities written`);

  // ── Write MenuWeeks as Week period entities ──
  console.log(`  Writing ${leMenuWeeks.length} Week entities...`);
  const weekEntityMap = new Map();

  for (const mw of leMenuWeeks) {
    const entityId = randomUUID();
    const isoWeek = getISOWeek(mw.weekStart);

    await localEffort.ledgerEvent.create({
      data: {
        eventType: 'menuweek.seeded',
        schemaVersion: 1,
        occurredAt: mw.createdAt,
        source: 'local-effort',
        sourceId: mw.id,
        actorType: 'system',
        payload: {
          menuWeekId: mw.id,
          weekStart: mw.weekStart,
          cutoffAt: mw.cutoffAt,
          status: mw.status,
        },
      },
    });

    await localEffort.brainEntity.create({
      data: {
        id: entityId,
        entityType: 'Week',
        name: isoWeek,
        properties: {
          weekStart: mw.weekStart,
          cutoffAt: mw.cutoffAt,
          menuWeekId: mw.id,
          status: mw.status,
        },
        status: 'active',
      },
    });

    weekEntityMap.set(mw.id, entityId);
  }
  console.log(`  ✓ ${leMenuWeeks.length} Week entities written`);

  // ── Write Orders as LedgerEvents + ORDERED assertions ──
  console.log(`  Writing ${leOrders.length} Order ledger events...`);
  let assertionCount = 0;

  for (const order of leOrders) {
    const customerEntityId = customerEntityMap.get(order.customerId);
    const weekEntityId = weekEntityMap.get(order.menuWeekId);

    const ledgerId = randomUUID();
    await localEffort.ledgerEvent.create({
      data: {
        id: ledgerId,
        eventType: 'order.seeded',
        schemaVersion: 1,
        occurredAt: order.submittedAt || order.createdAt,
        source: 'local-effort',
        sourceId: order.id,
        actorType: 'customer',
        actorId: order.customerId,
        payload: {
          orderId: order.id,
          customerId: order.customerId,
          menuWeekId: order.menuWeekId,
          status: order.status,
          totalsCents: order.totalsCents,
          tier: order.tier,
          itemCount: order.items?.length ?? 0,
        },
      },
    });

    // Assert Customer ORDERED Week
    if (customerEntityId && weekEntityId) {
      await localEffort.brainAssertion.create({
        data: {
          srcId: customerEntityId,
          dstId: weekEntityId,
          relType: 'ORDERED',
          metadata: {
            orderId: order.id,
            totalsCents: order.totalsCents,
            status: order.status,
            tier: order.tier,
          },
          validFrom: order.submittedAt || order.createdAt,
          knownFrom: order.createdAt,
          confidence: 1.0,
          sourceType: 'ledger_event',
          sourceId: ledgerId,
          createdBy: 'system',
        },
      });
      assertionCount++;
    }

    // Assert Customer ORDERED each Dish
    for (const item of (order.items || [])) {
      const dishEntityId = dishEntityMap.get(item.dishId);
      if (customerEntityId && dishEntityId) {
        await localEffort.brainAssertion.create({
          data: {
            srcId: customerEntityId,
            dstId: dishEntityId,
            relType: 'ORDERED',
            metadata: {
              orderId: order.id,
              menuWeekId: order.menuWeekId,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              isAddon: item.isAddon,
            },
            validFrom: order.submittedAt || order.createdAt,
            knownFrom: order.createdAt,
            confidence: 1.0,
            sourceType: 'ledger_event',
            sourceId: ledgerId,
            createdBy: 'system',
          },
        });
        assertionCount++;
      }
    }
  }
  console.log(`  ✓ ${leOrders.length} Order events + ${assertionCount} ORDERED assertions written`);

  // ── Write merge review candidates ──
  if (mergeReviews.length > 0) {
    console.log(`  Writing ${mergeReviews.length} BrainSeedReview rows...`);
    for (const review of mergeReviews) {
      const entityAId = vendorEntityMap.get(review.nameA);
      const entityBId = vendorEntityMap.get(review.nameB);
      if (entityAId && entityBId) {
        await localEffort.brainSeedReview.create({
          data: {
            entityAId,
            entityBId,
            matchScore: review.score,
            matchReason: 'name_fuzzy',
          },
        });
      }
    }
    console.log(`  ✓ BrainSeedReview rows written — review at /brain/seed-review`);
  }

  // ── Final counts ──
  const entityCount = await localEffort.brainEntity.count();
  const assertionTotal = await localEffort.brainAssertion.count();
  const ledgerTotal = await localEffort.ledgerEvent.count();
  const reviewTotal = await localEffort.brainSeedReview.count();

  console.log('\n── Seed complete ─────────────────────────────────────────────');
  console.log(`  BrainEntity rows:    ${entityCount}`);
  console.log(`  BrainAssertion rows: ${assertionTotal}`);
  console.log(`  LedgerEvent rows:    ${ledgerTotal}`);
  console.log(`  SeedReview pending:  ${reviewTotal}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeek(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Company Brain Seeder');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  if (ONLY_PHASE) console.log(`Running phase ${ONLY_PHASE} only`);

  try {
    const extracted = await phase1Extract();
    if (ONLY_PHASE === 1) { console.log('\nPhase 1 complete.'); return; }

    const merged = await phase2Merge(extracted);
    if (ONLY_PHASE === 2) { console.log('\nPhase 2 complete.'); return; }

    await phase3Write(merged);
  } finally {
    await localEffort.$disconnect();
  }
}

main().catch(e => {
  console.error('\nSeed failed:', e.message);
  console.error(e.stack);
  process.exit(1);
});
