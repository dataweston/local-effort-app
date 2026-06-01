const crypto = require('crypto');
const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent, findOrCreateEntity, canonicalName } = require('./ledger');
const { normalizeRelType, validateRelationship } = require('./relationshipDictionary');

const SOURCE = 'meal_prep_intake';

function compact(value, max = 120) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry == null) return false;
      if (Array.isArray(entry)) return entry.length > 0;
      if (typeof entry === 'object') return Object.keys(entry).length > 0;
      return String(entry).trim().length > 0;
    }),
  );
}

function fieldLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value || '');
}

function summarizeIntake(formData) {
  const priorityKeys = [
    'meals_per_week',
    'meal_mix',
    'proteins_selected',
    'proteins_everyday',
    'allergies',
    'dislikes',
    'dietary_notes',
    'meal_priorities',
    'cuisines',
    'spice_level',
    'budget_range',
    'preferred_delivery_day',
  ];

  return priorityKeys
    .filter(key => formData[key] !== undefined && formData[key] !== '' && (!Array.isArray(formData[key]) || formData[key].length))
    .map(key => `${fieldLabel(key)}: ${formatValue(formData[key])}`)
    .join('\n');
}

function sourceIdFor(formData) {
  const identity = compact(formData.email || formData.client_name || 'unknown', 80)
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
  const digest = crypto
    .createHash('sha1')
    .update(JSON.stringify(formData))
    .digest('hex')
    .slice(0, 16);
  return `meal-prep-intake:${identity}:${digest}`;
}

async function createAssertion(prisma, data) {
  const [src, dst] = await Promise.all([
    prisma.brainEntity.findUnique({ where: { id: data.srcId }, select: { id: true, entityType: true } }),
    prisma.brainEntity.findUnique({ where: { id: data.dstId }, select: { id: true, entityType: true } }),
  ]);
  const relType = normalizeRelType(data.relType);
  const validation = validateRelationship({
    relType,
    srcType: src?.entityType,
    dstType: dst?.entityType,
    srcId: data.srcId,
    dstId: data.dstId,
  });

  const existing = await prisma.brainAssertion.findFirst({
    where: {
      srcId: data.srcId,
      dstId: data.dstId,
      relType,
      sourceId: data.sourceId || null,
      retractedAt: null,
      knownUntil: null,
    },
  });
  if (existing) return existing;

  return prisma.brainAssertion.create({
    data: {
      ...data,
      relType,
      metadata: {
        ...(data.metadata || {}),
        ...(validation.warnings.length ? { relationshipWarnings: validation.warnings } : {}),
      },
    },
  });
}

async function addAlias(prisma, entityId, alias) {
  const trimmed = compact(alias, 160);
  if (!trimmed) return;
  await prisma.brainEntityAlias.upsert({
    where: { entityId_alias: { entityId, alias: trimmed } },
    update: {},
    create: { entityId, alias: trimmed, source: SOURCE },
  });
}

async function findCustomerByEmail(prisma, email) {
  if (!email) return null;
  return prisma.brainEntity.findFirst({
    where: {
      entityType: 'Customer',
      tombstonedAt: null,
      OR: [
        { aliases: { some: { alias: { equals: email, mode: 'insensitive' } } } },
        { properties: { path: ['email'], equals: email } },
      ],
    },
  });
}

async function ingestMealPrepIntake(formData, { logger } = {}) {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Prisma unavailable for meal prep intake brain ingest');
  }

  const submittedAt = new Date();
  const clientName = compact(formData.client_name || formData.name || formData.email || 'New Meal Prep Customer');
  const email = compact(formData.email || '').toLowerCase();
  const phone = compact(formData.phone || '');
  const summary = summarizeIntake(formData);
  const sourceId = sourceIdFor(formData);

  const ledgerEvent = await writeLedgerEvent({
    eventType: 'intake.meal_prep.submitted',
    schemaVersion: 1,
    occurredAt: submittedAt,
    source: SOURCE,
    sourceId,
    actorType: 'customer',
    actorId: email || clientName,
    payload: {
      intakeType: formData.intake_type || 'meal-prep-intake',
      clientName,
      email: email || null,
      phone: phone || null,
      address: formData.address || null,
      submittedAt: submittedAt.toISOString(),
      summary,
      answers: formData,
    },
  });

  const customerProperties = cleanObject({
    source: SOURCE,
    email: email || null,
    phone: phone || null,
    address: formData.address || null,
    householdSize: formData.household_size || null,
    preferredStartDate: formData.preferred_start_date || null,
    preferredDeliveryDay: formData.preferred_delivery_day || null,
    latestMealPrepIntakeAt: submittedAt.toISOString(),
    latestMealPrepIntakeLedgerEventId: ledgerEvent.id,
    latestMealPrepIntakeSummary: summary || null,
  });

  let customer = await findCustomerByEmail(prisma, email);
  let created = false;
  if (!customer) {
    const result = await findOrCreateEntity({
      entityType: 'Customer',
      name: clientName,
      properties: customerProperties,
      status: 'active',
    });
    customer = result.entity;
    created = result.created;
  }

  if (!created) {
    await prisma.brainEntity.update({
      where: { id: customer.id },
      data: {
        properties: {
          ...(customer.properties || {}),
          ...customerProperties,
        },
      },
    });
  }

  await addAlias(prisma, customer.id, email);
  await addAlias(prisma, customer.id, phone);

  const { entity: offer } = await findOrCreateEntity({
    entityType: 'Offer',
    name: 'Weekly Meal Prep',
    properties: { source: SOURCE, description: 'Recurring prepared meals for households and individual customers.' },
    status: 'active',
  });
  const { entity: channel } = await findOrCreateEntity({
    entityType: 'Channel',
    name: 'Website Intake Form',
    properties: { source: SOURCE, path: '/meal-prep-intake' },
    status: 'active',
  });

  const noteTitle = `Meal prep intake - ${clientName} - ${submittedAt.toISOString().slice(0, 10)}`;
  const note = await prisma.brainEntity.findFirst({
    where: {
      entityType: 'Note',
      tombstonedAt: null,
      properties: { path: ['ledgerEventId'], equals: ledgerEvent.id },
    },
  }) || await prisma.brainEntity.create({
    data: {
      entityType: 'Note',
      name: noteTitle,
      canonicalName: canonicalName(noteTitle),
      properties: {
        source: SOURCE,
        ledgerEventId: ledgerEvent.id,
        content: summary || 'Meal prep intake submitted.',
        answers: formData,
      },
      status: 'active',
    },
  });

  const assertionBase = {
    confidence: 1.0,
    sourceType: 'ledger_event',
    sourceId: ledgerEvent.id,
    createdBy: 'system',
    validFrom: submittedAt,
    knownFrom: submittedAt,
  };

  await createAssertion(prisma, {
    ...assertionBase,
    srcId: note.id,
    dstId: customer.id,
    relType: 'ABOUT',
    metadata: { sourceSpan: summary || 'Meal prep intake submitted.', intakeType: 'meal-prep-intake' },
  });
  await createAssertion(prisma, {
    ...assertionBase,
    srcId: customer.id,
    dstId: offer.id,
    relType: 'DISCUSSED_OFFER',
    metadata: { path: '/meal-prep-intake', intakeType: 'meal-prep-intake' },
  });
  await createAssertion(prisma, {
    ...assertionBase,
    srcId: customer.id,
    dstId: channel.id,
    relType: 'USES_CHANNEL',
    metadata: { path: '/meal-prep-intake', intakeType: 'meal-prep-intake' },
  });

  logger?.info?.({ customerId: customer.id, ledgerEventId: ledgerEvent.id }, 'brain: meal prep intake ingested');
  return { ok: true, customerId: customer.id, noteId: note.id, ledgerEventId: ledgerEvent.id };
}

module.exports = { ingestMealPrepIntake };
