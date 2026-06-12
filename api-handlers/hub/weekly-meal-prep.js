const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const TARGET_CUSTOMER_SLUGS = ['levy-family', 'sanjay-roy', 'katie-ferguson', 'tyler-cooper'];
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

function publicCustomer(customer, brainEntity) {
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

  return customers.map((customer) => publicCustomer(customer, brainByCustomerId.get(customer.id)));
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

    const [customers, notes] = await Promise.all([loadCustomers(auth), loadNotes()]);
    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      mode: auth.isCustomer && !auth.isPrivileged ? 'customer' : auth.isPrivileged ? 'privileged' : 'staff',
      customers,
      notes,
    });
  } catch (err) {
    console.error('[hub/weekly-meal-prep] error', err);
    return res.status(500).json({ error: 'Unable to load weekly meal prep' });
  }
}

module.exports = handler;
module.exports._internals = { activeWeekTabs, archiveExpiredWeekNotes, loadNotes, pairTitle };
