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
const NOTE_TABS = [
  { id: 'production', title: 'Production' },
  { id: 'packout', title: 'Packout' },
  { id: 'delivery', title: 'Delivery' },
];

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
  const sourceIds = NOTE_TABS.map((tab) => sourceIdForTab(tab.id));
  const docs = await prisma.hubDocument.findMany({
    where: { source: NOTE_SOURCE, sourceId: { in: sourceIds }, status: 'published' },
  });
  const bySourceId = new Map(docs.map((doc) => [doc.sourceId, doc]));
  return NOTE_TABS.map((tab) => ({
    ...tab,
    document: publicDoc(bySourceId.get(sourceIdForTab(tab.id))),
  }));
}

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { allowedAccess: ['staff', 'privileged', 'customer'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    if (req.method === 'POST') {
      if (auth.isCustomer && !auth.isPrivileged) return res.status(403).json({ error: 'Staff access required' });
      const tabId = cleanString(req.body?.tabId, 40) || 'production';
      const tab = NOTE_TABS.find((entry) => entry.id === tabId);
      if (!tab) return res.status(400).json({ error: 'Unknown note tab' });
      const body = typeof req.body?.body === 'string' ? req.body.body.slice(0, 40_000) : '';
      const doc = await prisma.hubDocument.upsert({
        where: { source_sourceId: { source: NOTE_SOURCE, sourceId: sourceIdForTab(tab.id) } },
        update: {
          title: `Weekly Meal Prep - ${tab.title}`,
          body,
          summary: 'Shared weekly meal prep note synced from Hub.',
          visibility: 'staff',
          category: 'weekly-meal-prep',
          tags: ['weekly-meal-prep', 'drafts'],
          createdByUserId: auth.viewer.userId || null,
        },
        create: {
          title: `Weekly Meal Prep - ${tab.title}`,
          body,
          summary: 'Shared weekly meal prep note synced from Hub.',
          visibility: 'staff',
          category: 'weekly-meal-prep',
          tags: ['weekly-meal-prep', 'drafts'],
          source: NOTE_SOURCE,
          sourceId: sourceIdForTab(tab.id),
          createdByUserId: auth.viewer.userId || null,
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
};
