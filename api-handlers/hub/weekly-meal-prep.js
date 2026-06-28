const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

// Active weekly meal-prep customers that exist as Customer table rows. Both Levy
// and Samantha now have a Customer row AND a linked brain entity (made symmetric
// by scripts/link-meal-prep-customers.js, 2026-06-27), so both come through here.
// Tyler is brain-only + paused; he's surfaced via the brain mealPrepStage path
// below (loadBrainRosterCustomers) and bucketed into the paused list.
const TARGET_CUSTOMER_SLUGS = ['levy-family', 'samantha-bailey'];
const NOTE_SOURCE = 'drafts';
const NOTE_TIMEZONE = 'America/Chicago';
const FUTURE_WEEK_COUNT = 3;

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return fallback;
  }
}

function sourceIdForTab(tabId) {
  return `weekly-meal-prep:${tabId}`;
}

function localToday() {
  // YYYY-MM-DD in kitchen-local time, so tabs roll over on local Tuesday.
  return new Date().toLocaleDateString('en-CA', { timeZone: NOTE_TIMEZONE });
}

function addDaysIso(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function pairTitle(sundayIso) {
  const sunday = new Date(`${sundayIso}T00:00:00`);
  const monday = new Date(`${sundayIso}T00:00:00`);
  monday.setDate(monday.getDate() + 1);
  const sundayLabel = sunday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const mondayLabel = monday.getMonth() === sunday.getMonth()
    ? String(monday.getDate())
    : monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `${sundayLabel}/${mondayLabel}`;
}

// Each prep week is a Sunday/Monday pair. A week's tab stays visible through
// its Monday and falls off on Tuesday; there are always FUTURE_WEEK_COUNT tabs.
function activeWeekTabs() {
  const today = localToday();
  const dayOfWeek = new Date(`${today}T00:00:00`).getDay(); // 0 = Sunday
  let sunday = addDaysIso(today, -dayOfWeek);
  if (today > addDaysIso(sunday, 1)) sunday = addDaysIso(sunday, 7);
  const tabs = [];
  for (let i = 0; i < FUTURE_WEEK_COUNT; i += 1) {
    tabs.push({ id: `week-${sunday}`, title: pairTitle(sunday), weekStart: sunday });
    sunday = addDaysIso(sunday, 7);
  }
  return tabs;
}

function weekStartFromSourceId(sourceId) {
  const match = /^weekly-meal-prep:week-(\d{4}-\d{2}-\d{2})$/.exec(String(sourceId || ''));
  return match ? match[1] : null;
}

// Move fallen-off week notes out of the notepad and into the knowledge graph
// as brain Note entities, so their contents stay queryable.
async function archiveExpiredWeekNotes(currentTabs) {
  const firstWeekStart = currentTabs[0]?.weekStart;
  if (!firstWeekStart) return;
  const docs = await prisma.hubDocument.findMany({
    where: { source: NOTE_SOURCE, sourceId: { startsWith: 'weekly-meal-prep:week-' }, status: 'published' },
  });
  for (const doc of docs) {
    const weekStart = weekStartFromSourceId(doc.sourceId);
    if (!weekStart || weekStart >= firstWeekStart) continue;
    const name = `Weekly Meal Prep — ${pairTitle(weekStart)}, ${weekStart.slice(0, 4)}`;
    const canonicalName = `weekly meal prep ${weekStart}`;
    const existing = await prisma.brainEntity.findFirst({
      where: { entityType: 'Note', canonicalName, tombstonedAt: null },
    });
    if (!existing) {
      await prisma.brainEntity.create({
        data: {
          entityType: 'Note',
          name,
          canonicalName,
          properties: {
            kind: 'weekly-meal-prep',
            weekStart,
            body: doc.body || '',
            hubDocumentId: doc.id,
            archivedAt: new Date().toISOString(),
          },
        },
      });
    }
    await prisma.hubDocument.update({ where: { id: doc.id }, data: { status: 'archived' } });
  }
}

function publicDoc(doc) {
  return doc
    ? {
        id: doc.id,
        title: doc.title,
        body: doc.body || '',
        updatedAt: asIso(doc.updatedAt),
        source: doc.source,
        sourceId: doc.sourceId,
      }
    : null;
}

function compactBrainEntity(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    name: entity.name,
    properties: entity.properties || {},
    assertions: (entity.srcAssertions || []).slice(0, 8).map((assertion) => ({
      relType: assertion.relType,
      dst: assertion.dst?.name || null,
      metadata: assertion.metadata || {},
      createdAt: asIso(assertion.createdAt),
    })),
    inferences: (entity.srcInferences || []).slice(0, 8).map((inference) => ({
      type: inference.inferenceType,
      confidence: inference.confidence,
      summary: inference.summary,
      computedAt: asIso(inference.computedAt),
    })),
  };
}

// ── Transaction & email enrichment ──────────────────────────────────────────
// Customer spend lives in the brain ledger as Square `order.placed` / `payment.completed`
// events (payments OUT to vendors live in local-budget; this is revenue IN). Gmail
// threads are `email.thread` events whose payload.participants list addresses. We pull
// these once and bucket them per customer by Square customer id and by email.

const TXN_EVENT_TYPES = ['order.placed', 'payment.completed'];
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

// Pull an amount in cents out of either event shape.
function txnAmountCents(payload) {
  const cents = payload?.totalCents ?? payload?.amountCents ?? 0;
  return Number.isFinite(Number(cents)) ? Number(cents) : 0;
}

// Collect any email addresses a Square event payload might carry (buyer email, note, actor).
function txnEmails(payload, actorId) {
  const haystack = [
    payload?.buyerEmail,
    payload?.buyer_email_address,
    payload?.merchantName, // squareIngest stores buyer email here as a fallback
    actorId,
  ].filter(Boolean).join(' ');
  return (haystack.match(EMAIL_RE) || []).map(normalizeEmail);
}

// Build a per-customer enrichment index from the ledger. Returns a function that,
// given a customer's { squareCustomerIds, emails }, yields { transactions, totalSpendCents,
// transactionCount, emailThreads, emailThreadCount }.
async function buildEnrichmentIndex({ squareCustomerIds, emails }) {
  const sqIds = [...new Set(squareCustomerIds.filter(Boolean))];
  const emailSet = new Set(emails.map(normalizeEmail).filter(Boolean));

  // Transactions: fetch recent Square revenue events. We over-fetch then bucket in JS,
  // because customerId/email live inside the JSON payload.
  const txnEvents = await prisma.ledgerEvent.findMany({
    where: { source: 'square', eventType: { in: TXN_EVENT_TYPES }, tombstonedAt: null },
    orderBy: { occurredAt: 'desc' },
    take: 2000,
  });

  // Email threads: fetch recent gmail threads, bucket by participant address.
  const emailEvents = emailSet.size
    ? await prisma.ledgerEvent.findMany({
        where: { source: 'gmail', eventType: 'email.thread', tombstonedAt: null },
        orderBy: { occurredAt: 'desc' },
        take: 4000,
      })
    : [];

  return function enrich({ squareCustomerIds: custSqIds = [], emails: custEmails = [] }) {
    const idSet = new Set(custSqIds.filter(Boolean));
    const mailSet = new Set(custEmails.map(normalizeEmail).filter(Boolean));

    const transactions = [];
    let totalSpendCents = 0;
    for (const ev of txnEvents) {
      const p = ev.payload || {};
      const matchById = p.customerId && idSet.has(p.customerId);
      const matchByEmail = mailSet.size && txnEmails(p, ev.actorId).some((e) => mailSet.has(e));
      if (!matchById && !matchByEmail) continue;
      const cents = txnAmountCents(p);
      totalSpendCents += cents;
      transactions.push({
        id: ev.sourceId || ev.id,
        occurredAt: asIso(ev.occurredAt),
        amountCents: cents,
        itemCount: p.itemCount ?? null,
        type: ev.eventType,
        matchedBy: matchById ? 'square_id' : 'email',
      });
    }

    const emailThreads = [];
    for (const ev of emailEvents) {
      const p = ev.payload || {};
      const parts = Array.isArray(p.participants) ? p.participants.join(' ') : '';
      const addrs = ((`${parts} ${p.from || ''} ${p.to || ''}`).match(EMAIL_RE) || []).map(normalizeEmail);
      if (!addrs.some((e) => mailSet.has(e))) continue;
      emailThreads.push({
        id: ev.sourceId || ev.id,
        occurredAt: asIso(ev.occurredAt),
        subject: p.subject || '(no subject)',
        snippet: p.snippet || '',
        messageCount: p.messageCount ?? null,
      });
    }

    return {
      transactionCount: transactions.length,
      totalSpendCents,
      transactions: transactions.slice(0, 5),
      emailThreadCount: emailThreads.length,
      emailThreads: emailThreads.slice(0, 5),
    };
  };
}

function summarizeRules(rawRules) {
  const rules = parseJson(rawRules, {});
  const sections = rules?.sectionRules || rules?.sections || {};
  if (sections && typeof sections === 'object' && !Array.isArray(sections)) {
    return Object.entries(sections)
      .map(([slug, rule]) => `${rule?.label || slug}: ${rule?.min || 0}-${rule?.max || 0}`)
      .join('; ');
  }
  const max = rules?.maxTotalItems ? `${rules.maxTotalItems} max items` : '';
  const entrees = rules?.requiredEntrees ? `${rules.requiredEntrees} entrees` : '';
  return [entrees, max].filter(Boolean).join('; ');
}

function publicCustomer(customer, brainEntity, enrichment = null) {
  const latestOrder = customer.orders?.[0] || null;
  const recentItems = (latestOrder?.items || []).map((item) => ({
    title: item.dish?.title || 'Unknown dish',
    quantity: item.quantity,
    tags: item.dish?.tags || [],
    allergens: item.dish?.allergens || [],
  }));

  return {
    id: customer.id,
    slug: customer.slug,
    name: customer.name || customer.slug,
    priceTierDefault: customer.priceTierDefault || null,
    planSummary: summarizeRules(customer.planRulesJson),
    profile: {
      householdSize: customer.profile?.householdSize || '',
      phone: customer.profile?.phone || '',
      address: customer.profile?.address || '',
      deliveryNotes: customer.profile?.deliveryNotes || '',
      intakeSurvey: customer.profile?.intakeSurvey || null,
    },
    users: (customer.users || []).map((user) => ({ id: user.id, email: user.email, role: user.role })),
    latestOrder: latestOrder
      ? {
          id: latestOrder.id,
          weekStart: asIso(latestOrder.menuWeek?.weekStart),
          status: latestOrder.status,
          submittedAt: asIso(latestOrder.submittedAt),
          itemCount: latestOrder.items?.length || 0,
          items: recentItems,
        }
      : null,
    brain: compactBrainEntity(brainEntity),
    ...(enrichment || { transactionCount: 0, totalSpendCents: 0, transactions: [], emailThreadCount: 0, emailThreads: [] }),
  };
}

async function loadCustomers(auth) {
  const where = auth.isCustomer
    ? { id: auth.customer?.id || '__none__' }
    : { slug: { in: TARGET_CUSTOMER_SLUGS } };

  const customers = await prisma.customer.findMany({
    where,
    include: {
      profile: true,
      users: { select: { id: true, email: true, role: true } },
      orders: {
        where: { status: { in: ['paid', 'submitted', 'draft'] } },
        include: {
          menuWeek: { select: { id: true, weekStart: true } },
          items: { include: { dish: { select: { title: true, tags: true, allergens: true } } } },
        },
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        take: 1,
      },
    },
    orderBy: [{ name: 'asc' }, { slug: 'asc' }],
  });

  const brainEntities = await prisma.brainEntity.findMany({
    where: {
      entityType: 'Customer',
      localEffortCustomerId: { in: customers.map((customer) => customer.id) },
      tombstonedAt: null,
    },
    include: {
      srcAssertions: {
        where: { retractedAt: null },
        include: { dst: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 12,
      },
      srcInferences: {
        where: { staleAt: null },
        orderBy: [{ confidence: 'desc' }, { computedAt: 'desc' }],
        take: 12,
      },
    },
  });
  const brainByCustomerId = new Map(brainEntities.map((entity) => [entity.localEffortCustomerId, entity]));

  // Gather identifiers for transaction/email matching across all customers.
  const emailsFor = (customer) => (customer.users || []).map((u) => u.email).filter(Boolean);
  const sqIdFor = (customer) => brainByCustomerId.get(customer.id)?.squareCustomerId || null;
  const enrich = await buildEnrichmentIndex({
    squareCustomerIds: customers.map(sqIdFor),
    emails: customers.flatMap(emailsFor),
  });

  return customers.map((customer) => publicCustomer(
    customer,
    brainByCustomerId.get(customer.id),
    enrich({ squareCustomerIds: [sqIdFor(customer)], emails: emailsFor(customer) }),
  ));
}

// Upcoming customers: brain Customer entities created from a website intake that
// have not yet been linked to a live (active) customer record. These are prospects
// whose profile exists but who are not on the active roster.
function publicUpcomingCustomer(entity, enrichment = null) {
  const props = entity.properties || {};
  const estimate = props.latestMealPrepEstimate || null;
  return {
    id: entity.id,
    name: entity.name,
    email: props.email || null,
    phone: props.phone || null,
    householdSize: props.householdSize || null,
    address: props.address || null,
    preferredStartDate: props.preferredStartDate || null,
    deliveryPreference: props.deliveryPreference || null,
    intakeSubmittedAt: props.latestMealPrepIntakeAt || asIso(entity.createdAt),
    estimateWeeklyTotal: props.latestMealPrepEstimateWeeklyTotal ?? estimate?.weeklyTotal ?? null,
    summary: props.latestMealPrepIntakeSummary || null,
    ...(enrichment || { transactionCount: 0, totalSpendCents: 0, transactions: [], emailThreadCount: 0, emailThreads: [] }),
  };
}

async function loadUpcomingCustomers() {
  const entities = await prisma.brainEntity.findMany({
    where: {
      entityType: 'Customer',
      tombstonedAt: null,
      localEffortCustomerId: null,
      properties: { path: ['mealPrepStage'], equals: 'upcoming' },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const emailFor = (entity) => [entity.properties?.email].filter(Boolean);
  const enrich = await buildEnrichmentIndex({
    squareCustomerIds: entities.map((e) => e.squareCustomerId).filter(Boolean),
    emails: entities.flatMap(emailFor),
  });

  return entities.map((entity) => publicUpcomingCustomer(
    entity,
    enrich({ squareCustomerIds: [entity.squareCustomerId], emails: emailFor(entity) }),
  ));
}

// Roster customers that live ONLY in the knowledge graph (intake + Square),
// without a Customer table row — e.g. Tyler. Driven by mealPrepStage so the
// roster is data, not a hardcoded slug list. Returns both 'active' and 'paused';
// the caller buckets paused out of the active roster into its own list.
async function loadBrainRosterCustomers() {
  const entities = await prisma.brainEntity.findMany({
    where: {
      entityType: 'Customer',
      tombstonedAt: null,
      localEffortCustomerId: null, // table-row customers already come via loadCustomers
      // JSON path filters don't support `in`; OR two equals checks instead.
      OR: [
        { properties: { path: ['mealPrepStage'], equals: 'active' } },
        { properties: { path: ['mealPrepStage'], equals: 'paused' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: 100,
  });

  const emailFor = (entity) => [entity.properties?.email].filter(Boolean);
  const enrich = await buildEnrichmentIndex({
    squareCustomerIds: entities.map((e) => e.squareCustomerId).filter(Boolean),
    emails: entities.flatMap(emailFor),
  });

  // Shape these like table-row customers so the UI renders them in one list, but
  // mark their brain origin and lifecycle stage.
  return entities.map((entity) => {
    const props = entity.properties || {};
    const enrichment = enrich({ squareCustomerIds: [entity.squareCustomerId], emails: emailFor(entity) });
    return {
      id: entity.id,
      slug: null,
      name: entity.name,
      source: 'brain',
      mealPrepStage: props.mealPrepStage || 'active',
      priceTierDefault: null,
      planSummary: props.latestMealPrepIntakeSummary || '',
      profile: {
        householdSize: props.householdSize || '',
        phone: props.phone || '',
        address: props.address || '',
        deliveryNotes: props.deliveryPreference || '',
        intakeSurvey: null,
      },
      users: props.email ? [{ id: null, email: props.email, role: 'subscriber' }] : [],
      latestOrder: null,
      brain: compactBrainEntity(entity),
      ...enrichment,
    };
  });
}

async function loadNotes() {
  const tabs = activeWeekTabs();
  await archiveExpiredWeekNotes(tabs);
  const sourceIds = tabs.map((tab) => sourceIdForTab(tab.id));
  const docs = await prisma.hubDocument.findMany({
    where: { source: NOTE_SOURCE, sourceId: { in: sourceIds }, status: 'published' },
  });
  const bySourceId = new Map(docs.map((doc) => [doc.sourceId, doc]));
  return tabs.map((tab) => ({
    ...tab,
    document: publicDoc(bySourceId.get(sourceIdForTab(tab.id))),
  }));
}

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { allowedAccess: ['staff', 'privileged', 'customer'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    if (req.method === 'POST') {
      if (auth.isCustomer && !auth.isPrivileged) return res.status(403).json({ error: 'Staff access required' });
      const tabs = activeWeekTabs();
      const tabId = cleanString(req.body?.tabId, 40) || tabs[0].id;
      const tab = tabs.find((entry) => entry.id === tabId);
      if (!tab) return res.status(400).json({ error: 'Unknown note tab' });
      const body = typeof req.body?.body === 'string' ? req.body.body.slice(0, 40_000) : '';
      const payload = {
        title: `Weekly Meal Prep — ${tab.title}`,
        body,
        summary: 'Shared weekly meal prep menu. Falls off the notepad on Tuesday and archives to the brain.',
        visibility: 'staff',
        category: 'weekly-meal-prep',
        tags: ['weekly-meal-prep', 'drafts'],
        createdByUserId: auth.viewer.userId || null,
      };
      const doc = await prisma.hubDocument.upsert({
        where: { source_sourceId: { source: NOTE_SOURCE, sourceId: sourceIdForTab(tab.id) } },
        update: payload,
        create: {
          ...payload,
          source: NOTE_SOURCE,
          sourceId: sourceIdForTab(tab.id),
        },
      });
      return res.status(200).json({ ok: true, note: { ...tab, document: publicDoc(doc) } });
    }

    const showRoster = !auth.isCustomer || auth.isPrivileged;
    const [tableCustomers, brainCustomers, upcomingCustomers, notes] = await Promise.all([
      loadCustomers(auth),
      showRoster ? loadBrainRosterCustomers() : Promise.resolve([]),
      showRoster ? loadUpcomingCustomers() : Promise.resolve([]),
      loadNotes(),
    ]);
    // Paused customers (e.g. Tyler) belong in their own list, not the active
    // roster. Split them out so the active table stays current-roster only.
    const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
    const isPaused = (c) => c.mealPrepStage === 'paused';
    const customers = [...tableCustomers, ...brainCustomers].filter((c) => !isPaused(c)).sort(byName);
    const pausedCustomers = [...tableCustomers, ...brainCustomers].filter(isPaused).sort(byName);
    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      mode: auth.isCustomer && !auth.isPrivileged ? 'customer' : auth.isPrivileged ? 'privileged' : 'staff',
      customers,
      pausedCustomers,
      upcomingCustomers,
      notes,
    });
  } catch (err) {
    console.error('[hub/weekly-meal-prep] error', err);
    return res.status(500).json({ error: 'Unable to load weekly meal prep' });
  }
}

module.exports = handler;
module.exports._internals = { activeWeekTabs, archiveExpiredWeekNotes, loadNotes, pairTitle };
