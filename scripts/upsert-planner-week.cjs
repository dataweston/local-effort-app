require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseArgs(argv) {
  const dataIndex = argv.indexOf('--data');
  if (dataIndex === -1 || !argv[dataIndex + 1]) throw new Error('--data <json-file> is required');
  return { dataPath: path.resolve(argv[dataIndex + 1]), apply: argv.includes('--apply') };
}

function loadPayload(dataPath) {
  const repoRoot = path.resolve(__dirname, '..');
  const relative = path.relative(repoRoot, dataPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Data file must be inside this repository');
  const payload = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!payload.weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(payload.weekStart)) throw new Error('weekStart must be YYYY-MM-DD');
  if (!Array.isArray(payload.cards)) payload.cards = [];
  if (payload.recurringSeries != null && !Array.isArray(payload.recurringSeries)) throw new Error('recurringSeries must be an array');
  for (const series of payload.recurringSeries || []) {
    if (!series.id || !series.startDate || !series.endDate || !series.card?.title) {
      throw new Error('Each recurring series needs id, startDate, endDate, and card.title');
    }
    let cursor = new Date(`${series.startDate}T00:00:00Z`);
    const end = new Date(`${series.endDate}T00:00:00Z`);
    while (cursor <= end) {
      const date = cursor.toISOString().slice(0, 10);
      const paid = series.paidThrough && date <= series.paidThrough;
      payload.cards.push({
        ...series.card,
        id: `${series.id}-${date}`,
        templateId: series.templateId || series.id,
        date,
        dayOfWeek: series.dayOfWeek,
        cashReceivedCents: paid ? Number(series.card.revenueCents || 0) : Number(series.card.cashReceivedCents || 0),
        financialStatus: paid ? 'paid' : (series.card.financialStatus || 'forecast'),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
  }
  const ids = payload.cards.map((card) => card.id);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) throw new Error('Every card needs a unique deterministic id');
  return payload;
}

function cardData(card, supabaseUid) {
  return {
    supabaseUid,
    templateId: card.templateId ?? null,
    title: card.title,
    date: card.date,
    dayOfWeek: card.dayOfWeek,
    zone: card.zone || 'untimed',
    objectType: card.objectType || 'prep_task',
    people: card.people || [],
    startTime: card.startTime ?? null,
    endTime: card.endTime ?? null,
    revenue: card.revenue ?? Math.round(Number(card.revenueCents || 0) / 100),
    revenueCents: card.revenueCents ?? null,
    cashReceivedCents: card.cashReceivedCents ?? 0,
    cost: card.cost ?? Math.round(Number(card.costCents || 0) / 100),
    costCents: card.costCents ?? null,
    costPerHour: card.costPerHour ?? (card.costPerHourCents == null ? null : Math.round(card.costPerHourCents / 100)),
    costPerHourCents: card.costPerHourCents ?? null,
    financialStatus: card.financialStatus ?? null,
    financialSource: card.financialSource ?? null,
    financialMetadata: card.financialMetadata ?? undefined,
    notes: card.notes ?? null,
    optional: card.optional ?? false,
    enabled: card.enabled ?? true,
    effectTarget: card.effectTarget ?? null,
    effectType: card.effectType ?? null,
    sortOrder: card.sortOrder ?? 0,
    status: card.status ?? 'todo',
    projectId: card.projectId ?? null,
    assigneeId: card.assigneeId ?? null,
    priority: card.priority ?? 0,
    dueDate: card.dueDate ?? null,
  };
}

async function main() {
  const { dataPath, apply } = parseArgs(process.argv.slice(2));
  const payload = loadPayload(dataPath);
  const supabaseUid = process.env.HUB_MASTER_SUPABASE_UID || process.env.VITE_HUB_MASTER_SUPABASE_UID;
  if (!supabaseUid) throw new Error('HUB_MASTER_SUPABASE_UID is required');

  const existing = await prisma.plannerCard.findMany({
    where: { id: { in: payload.cards.map((card) => card.id) } },
    select: { id: true, title: true, date: true, supabaseUid: true },
  });
  const foreign = existing.filter((card) => card.supabaseUid !== supabaseUid);
  if (foreign.length) throw new Error(`Refusing to overwrite ${foreign.length} card(s) owned by another planner`);

  const summary = {
    mode: apply ? 'applied' : 'dry-run',
    weekStart: payload.weekStart,
    cards: payload.cards.length,
    existingCards: existing.length,
    cogs: payload.cogs?.length || 0,
    overheads: payload.overheads?.length || 0,
    revenueCents: payload.cards.reduce((sum, card) => sum + Number(card.revenueCents || 0), 0),
    cashReceivedCents: payload.cards.reduce((sum, card) => sum + Number(card.cashReceivedCents || 0), 0),
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const card of payload.cards) {
      const data = cardData(card, supabaseUid);
      await tx.plannerCard.upsert({ where: { id: card.id }, update: data, create: { id: card.id, ...data } });
    }
    for (const item of payload.cogs || []) {
      const data = {
        supabaseUid,
        weekStart: payload.weekStart,
        name: item.name,
        amount: item.amount ?? Math.round(Number(item.amountCents || 0) / 100),
        amountCents: item.amountCents ?? null,
        status: item.status || 'projected',
        source: item.source || null,
        notes: item.notes || null,
      };
      await tx.plannerCOGS.upsert({ where: { id: item.id }, update: data, create: { id: item.id, ...data } });
    }
    for (const item of payload.overheads || []) {
      const data = { supabaseUid, name: item.name, monthlyCost: item.monthlyCost || 0 };
      await tx.plannerOverhead.upsert({ where: { id: item.id }, update: data, create: { id: item.id, ...data } });
    }
  }, { timeout: 30000 });

  const [savedCards, savedCogs, savedOverheads] = await Promise.all([
    prisma.plannerCard.findMany({
      where: { id: { in: payload.cards.map((card) => card.id) }, supabaseUid },
      select: { revenueCents: true, cashReceivedCents: true },
    }),
    prisma.plannerCOGS.count({ where: { id: { in: (payload.cogs || []).map((item) => item.id) }, supabaseUid } }),
    prisma.plannerOverhead.count({ where: { id: { in: (payload.overheads || []).map((item) => item.id) }, supabaseUid } }),
  ]);
  summary.persistedCards = savedCards.length;
  summary.persistedCogs = savedCogs;
  summary.persistedOverheads = savedOverheads;
  summary.persistedRevenueCents = savedCards.reduce((sum, card) => sum + Number(card.revenueCents || 0), 0);
  summary.persistedCashReceivedCents = savedCards.reduce((sum, card) => sum + Number(card.cashReceivedCents || 0), 0);
  if (
    summary.persistedCards !== summary.cards
    || summary.persistedCogs !== summary.cogs
    || summary.persistedOverheads !== summary.overheads
    || summary.persistedRevenueCents !== summary.revenueCents
    || summary.persistedCashReceivedCents !== summary.cashReceivedCents
  ) throw new Error('Post-write verification failed: persisted planner totals do not match the import payload');

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
