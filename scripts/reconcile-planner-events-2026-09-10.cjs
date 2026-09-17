'use strict';

/**
 * Reconcile the seven September/October 2026 commitments supplied by the owner.
 *
 * Dry-run: node scripts/reconcile-planner-events-2026-09-10.cjs
 * Apply:   node scripts/reconcile-planner-events-2026-09-10.cjs --apply
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const PLANNER_UID = process.env.HUB_MASTER_SUPABASE_UID || process.env.VITE_HUB_MASTER_SUPABASE_UID;
const OWNER_SOURCE = 'Owner instruction 2026-09-10';

function mergeMetadata(existing, patch) {
  return { ...(existing || {}), ...patch };
}

function preserveWorkingMenu(notes) {
  const text = String(notes || '');
  const marker = 'Working menu from Gmail:';
  const index = text.indexOf(marker);
  return index === -1 ? '' : `\n\n${text.slice(index).trim()}`;
}

const events = [
  {
    id: 'event-2026-09-12-happy-monday-anniversary-party',
    title: 'Happy Monday anniversary party — pizza service',
    date: '2026-09-12',
    dayOfWeek: 'Saturday',
    startTime: '08:00',
    endTime: '16:00',
    status: 'scheduled',
    financialStatus: 'scheduled_financials_tbd',
    metadata: {
      detailSource: 'owner_instruction_2026-09-10',
      clientName: 'Happy Monday',
      serviceType: 'anniversary_party_pizza_service',
      location: 'Roseville, MN',
      menuSummary: 'Pizzas à la carte',
      endTimeApproximate: true,
      prepSchedulingStatus: 'needs_schedule',
    },
    notes: () => 'Happy Monday anniversary party in Roseville. Pizza service à la carte. Service window is 8:00 AM to approximately 4:00 PM. Prep date/time and financial terms still need scheduling.',
  },
  {
    id: 'event-2026-09-13-olivia-baby-shower',
    title: 'Olivia baby shower — St. Louis Park',
    date: '2026-09-13',
    dayOfWeek: 'Sunday',
    startTime: '12:00',
    endTime: '15:00',
    status: 'scheduled',
    financialStatus: 'scheduled_financials_tbd',
    metadata: {
      detailSource: 'owner_instruction_2026-09-10',
      clientName: 'Olivia',
      serviceType: 'baby_shower',
      location: 'St. Louis Park, MN',
      guestEstimate: 58,
      menuSummary: 'Sandwiches, platters, and beverage service',
      prepSchedulingStatus: 'needs_schedule',
      evidenceRefs: ['gmail:19f48a35978b1c79'],
    },
    notes: () => 'Baby shower for Olivia in St. Louis Park. 58 guests. Sandwiches, platters, and beverage service from 12:00 PM to 3:00 PM. Prep date/time and financial terms still need scheduling.',
  },
  {
    id: 'event-2026-09-20-private-dinner-six',
    title: 'Private dinner — 6 guests',
    date: '2026-09-20',
    dayOfWeek: 'Sunday',
    startTime: null,
    endTime: null,
    status: 'scheduled',
    financialStatus: 'scheduled_time_tbd',
    metadata: {
      detailSource: 'owner_instruction_2026-09-10',
      serviceType: 'private_dinner',
      guestEstimate: 6,
      eventTimeTbd: true,
      locationTbd: true,
      prepSchedulingStatus: 'needs_schedule',
    },
    notes: () => 'Private dinner for 6 guests. Client, location, service time, prep date/time, menu, and financial terms still need confirmation.',
  },
  {
    id: 'event-2026-09-23-john-dinner',
    title: 'John Burelbach — private dinner',
    date: '2026-09-23',
    dayOfWeek: 'Wednesday',
    startTime: null,
    endTime: null,
    status: 'scheduled',
    financialStatus: 'scheduled_time_tbd',
    metadata: {
      detailSource: 'owner_instruction_2026-09-10',
      clientName: 'John Burelbach',
      serviceType: 'private_dinner',
      guestEstimate: 6,
      eventTimeTbd: true,
      locationTbd: true,
      prepSchedulingStatus: 'needs_schedule',
      evidenceRefs: ['gmail:1a04469ae7216710'],
    },
    notes: () => 'Private dinner for John Burelbach and 6 guests total. Gmail thread “Sept 23” corroborates the date. Location, service time, prep date/time, menu, and financial terms still need confirmation.',
  },
  {
    id: 'event-2026-09-25-clare-apple-crisps',
    title: 'Gibbs Farm Apple Festival — 7 apple crisp pans',
    date: '2026-09-25',
    dayOfWeek: 'Friday',
    startTime: null,
    endTime: null,
    status: 'scheduled',
    financialStatus: 'scheduled_time_tbd',
    metadata: {
      detailSource: 'owner_instruction_2026-09-10',
      clientName: 'Clare Holte',
      serviceType: 'prepared_food_delivery',
      location: 'Gibbs Farm',
      quantity: 7,
      quantityUnit: 'pans',
      menuSummary: 'Apple crisps',
      eventTimeTbd: true,
      prepSchedulingStatus: 'needs_schedule',
      possibleBrainCustomerName: 'Clare Holte',
      possibleBrainCustomerConfidence: 'corroborated_by_gmail_sender',
      evidenceRefs: ['gmail:1a05e6272a58b12f'],
    },
    financialSource(existing) {
      return existing?.financialSource
        || 'Existing planner amounts; payment provenance still needs verification';
    },
    notes: () => 'Seven pans of apple crisp for Gibbs Farm. Clare Holte’s Gmail thread “Apple Crisp for Gibbs Farm Apple Festival” corroborates the customer and job. Delivery/service time, prep date/time, pan size, and payment provenance still need confirmation.',
  },
  {
    id: 'event-2026-09-26-gigi-baby-shower',
    title: 'Gigi Rehnberg baby shower — Edina',
    date: '2026-09-26',
    dayOfWeek: 'Saturday',
    startTime: null,
    endTime: null,
    status: 'confirmed',
    financialStatus: 'booked_deposit_received_estimate',
    metadata: {
      detailSource: 'owner_instruction_2026-09-10',
      clientName: 'Gigi Rehnberg',
      serviceType: 'baby_shower',
      location: 'Edina, MN',
      guestEstimate: 30,
      eventTimeTbd: true,
      prepSchedulingStatus: 'needs_schedule',
    },
    notes: () => 'BOOKED — deposit received. Baby shower in Edina for 30 guests. Pricing remains $45/person ($1,350) plus wine currently estimated at $400, for a $1,750 working total. Square invoice #000058 records the $250 deposit paid July 23, leaving an estimated $1,500 to collect. Service time, prep date/time, menu, and final wine amount still need confirmation.',
  },
  {
    id: 'event-2026-10-10-laura-dotson-wedding',
    title: 'Laura Dotson & Danny Lumbar wedding — Gibbs Farm',
    date: '2026-10-10',
    dayOfWeek: 'Saturday',
    startTime: null,
    endTime: null,
    status: 'confirmed',
    financialStatus: 'booked_deposit_received_estimate',
    revenueCents: 360000,
    metadata: {
      detailSource: 'owner_instruction_2026-09-10',
      clientName: 'Laura Dotson & Danny Lumbar',
      serviceType: 'wedding_buffet',
      location: 'Gibbs Farm',
      guestEstimate: 60,
      menuSummary: 'Buffet',
      eventTimeTbd: true,
      prepSchedulingStatus: 'needs_schedule',
      currentRevenueEstimateCents: 360000,
      balanceCents: 318500,
      evidenceRefs: ['gmail:19f62235cc9d74b7', 'square-invoice:000055'],
    },
    financialSource: () => '$60/person retained from owner-confirmed 2026-08-15 pricing; guest count updated to 60 by owner on 2026-09-10; Square invoice 000055 paid July 19',
    notes(existing) {
      return 'BOOKED — deposit received. Wedding buffet at Gibbs Farm for 60 guests. At the existing $60/person rate, the working total is $3,600. Square invoice #000055 records the $415 deposit paid July 19, leaving an estimated $3,185 to collect. Service time and prep date/time still need confirmation.'
        + preserveWorkingMenu(existing?.notes);
    },
  },
];

function buildData(spec, existing) {
  const revenueCents = spec.revenueCents ?? existing?.revenueCents ?? 0;
  const cashReceivedCents = existing?.cashReceivedCents ?? 0;
  return {
    supabaseUid: PLANNER_UID,
    title: spec.title,
    date: spec.date,
    dayOfWeek: spec.dayOfWeek,
    zone: spec.startTime ? 'timed' : 'untimed',
    objectType: 'event',
    people: existing?.people || [],
    startTime: spec.startTime,
    endTime: spec.endTime,
    revenue: Math.round(revenueCents / 100),
    revenueCents,
    cashReceivedCents,
    cost: existing?.cost || 0,
    costCents: existing?.costCents ?? null,
    costPerHour: existing?.costPerHour ?? null,
    costPerHourCents: existing?.costPerHourCents ?? null,
    financialStatus: spec.financialStatus,
    financialSource: typeof spec.financialSource === 'function'
      ? spec.financialSource(existing)
      : (spec.financialSource ?? existing?.financialSource ?? `${OWNER_SOURCE}; financial terms TBD`),
    financialMetadata: mergeMetadata(existing?.financialMetadata, spec.metadata),
    notes: spec.notes(existing),
    optional: false,
    enabled: true,
    sortOrder: existing?.sortOrder ?? 10,
    status: spec.status,
    projectId: existing?.projectId ?? null,
    assigneeId: existing?.assigneeId ?? null,
    priority: Math.max(existing?.priority || 0, 2),
    dueDate: existing?.dueDate ?? null,
  };
}

function compact(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.startTime ? `${row.startTime}-${row.endTime || '?'}` : 'TBD',
    status: row.status,
    revenueCents: row.revenueCents,
    cashReceivedCents: row.cashReceivedCents,
    location: row.financialMetadata?.location || null,
    guests: row.financialMetadata?.guestEstimate || null,
    prep: row.financialMetadata?.prepSchedulingStatus || null,
  };
}

async function main() {
  if (!PLANNER_UID) throw new Error('HUB_MASTER_SUPABASE_UID is required');

  const existingRows = await prisma.plannerCard.findMany({
    where: { id: { in: events.map((event) => event.id) } },
  });
  for (const row of existingRows) {
    if (row.supabaseUid !== PLANNER_UID) {
      throw new Error(`Refusing to update ${row.id}; it belongs to another planner`);
    }
  }

  const proposed = events.map((spec) => {
    const existing = existingRows.find((row) => row.id === spec.id);
    return { id: spec.id, exists: Boolean(existing), data: buildData(spec, existing) };
  });

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    events: proposed.map(({ id, exists, data }) => ({ exists, ...compact({ id, ...data }) })),
  }, null, 2));

  if (!APPLY) return;

  await prisma.$transaction(proposed.map(({ id, data }) => prisma.plannerCard.upsert({
    where: { id },
    update: data,
    create: { id, ...data },
  })));

  const verified = await prisma.plannerCard.findMany({
    where: { id: { in: events.map((event) => event.id) }, supabaseUid: PLANNER_UID },
    orderBy: { date: 'asc' },
  });
  if (verified.length !== events.length) {
    throw new Error(`Post-write verification failed: expected ${events.length} events, found ${verified.length}`);
  }
  console.log(JSON.stringify({ verified: verified.map(compact) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
