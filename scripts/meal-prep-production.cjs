#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const {
  assignCustomerDish,
  loadCanonicalWeek,
  recordChangeRequest,
  resolveChangeRequest,
  resolveWeekStart,
  syncMealPrepWeek,
  unassignCustomerDish,
} = require('../backend/api/planner/mealPrepProduction');

const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const command = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'sync';

function has(flag) {
  return argv.includes(flag);
}

function arg(flag, fallback = null) {
  const index = argv.indexOf(flag);
  return index === -1 ? fallback : argv[index + 1];
}

function requireArg(flag) {
  const value = arg(flag);
  if (!value || value.startsWith('--')) throw new Error(`${flag} is required`);
  return value;
}

function compactResult(result) {
  return {
    mode: result.mode,
    weekStart: result.weekStart,
    cycleId: result.cycle?.id || null,
    cycleStatus: result.blockers?.length ? 'blocked' : 'ready',
    batch: result.batch
      ? { id: result.batch.id, version: result.batch.version, status: result.batch.status, reused: result.reused }
      : null,
    source: {
      notePresent: Boolean(result.cycle?.sourceSnapshot?.notePresent),
      sourceDocumentId: result.cycle?.sourceDocumentId || null,
      bodyHash: result.cycle?.sourceBodyHash || null,
      parsedDishes: result.cycle?.items?.length || 0,
    },
    commitments: (result.sheet?.commitments || []).map((commitment) => ({
      plannerCardId: commitment.sourcePlannerCardId,
      customerMenuId: commitment.customerMenuId,
      customerName: commitment.customerName,
      serviceDate: commitment.serviceDate,
      status: commitment.status,
      revenueCents: commitment.revenueCents,
      requirementCount: commitment.requirements.length,
      assignmentCount: commitment.items.length,
      openChangeRequests: commitment.changeRequests.filter((request) => request.status === 'open').length,
    })),
    plannerDiff: result.plannerDiff,
    readiness: result.sheet?.readiness || null,
    blockers: result.blockers || [],
  };
}

async function sync({ apply = has('--apply') } = {}) {
  const weekStart = resolveWeekStart(arg('--week'));
  if (!weekStart) throw new Error('--week must be a valid YYYY-MM-DD date');
  const result = await syncMealPrepWeek({
    prisma,
    weekStart,
    supabaseUid: arg('--uid', process.env.HUB_MASTER_SUPABASE_UID || null),
    apply,
    createdBy: arg('--actor', process.env.USER || process.env.USERNAME || 'meal-prep-production-cli'),
  });
  console.log(JSON.stringify(compactResult(result), null, 2));
  if (result.blockers.length) process.exitCode = 2;
  return result;
}

async function show() {
  const weekStart = resolveWeekStart(arg('--week'));
  if (!weekStart) throw new Error('--week must be a valid YYYY-MM-DD date');
  const loaded = await loadCanonicalWeek(prisma, weekStart);
  if (!loaded.cycle) throw new Error(`No canonical meal-prep cycle exists for ${weekStart}.`);
  const latest = loaded.cycle.productionBatches[0] || null;
  console.log(JSON.stringify({
    weekStart,
    cycle: {
      id: loaded.cycle.id,
      status: loaded.cycle.status,
      sourceDocumentId: loaded.cycle.sourceDocumentId,
      sourceBodyHash: loaded.cycle.sourceBodyHash,
      menuItemCount: loaded.cycle.items.length,
      customerMenuCount: loaded.cycle.customerMenus.length,
    },
    latestBatch: latest,
  }, null, 2));
  if (latest?.status === 'blocked') process.exitCode = 2;
}

async function assign() {
  const weekStart = resolveWeekStart(arg('--week'));
  if (!weekStart) throw new Error('--week must be a valid YYYY-MM-DD date');
  const input = {
    weekStart,
    customerName: requireArg('--customer'),
    dishName: requireArg('--dish'),
    quantity: Number(arg('--quantity', '1')),
    meal: arg('--meal'),
    diet: arg('--diet'),
    station: arg('--station'),
    chef: arg('--chef'),
    prepDay: arg('--prep-day'),
    notes: arg('--notes'),
  };
  if (!has('--apply')) {
    console.log(JSON.stringify({ mode: 'dry-run', action: 'assign', ...input }, null, 2));
    return;
  }
  const assignment = await assignCustomerDish({ prisma, ...input });
  const result = await syncMealPrepWeek({
    prisma,
    weekStart,
    supabaseUid: arg('--uid', process.env.HUB_MASTER_SUPABASE_UID || null),
    apply: true,
    createdBy: arg('--actor', process.env.USER || process.env.USERNAME || 'meal-prep-production-cli'),
  });
  console.log(JSON.stringify({ action: 'assign', assignment, production: compactResult(result) }, null, 2));
  if (result.blockers.length) process.exitCode = 2;
}

async function unassign() {
  const weekStart = resolveWeekStart(arg('--week'));
  if (!weekStart) throw new Error('--week must be a valid YYYY-MM-DD date');
  const input = {
    weekStart,
    customerName: requireArg('--customer'),
    dishName: requireArg('--dish'),
    meal: arg('--meal'),
  };
  if (!has('--apply')) {
    console.log(JSON.stringify({ mode: 'dry-run', action: 'unassign', ...input }, null, 2));
    return;
  }
  const assignment = await unassignCustomerDish({ prisma, ...input });
  const result = await syncMealPrepWeek({
    prisma,
    weekStart,
    supabaseUid: arg('--uid', process.env.HUB_MASTER_SUPABASE_UID || null),
    apply: true,
    createdBy: arg('--actor', process.env.USER || process.env.USERNAME || 'meal-prep-production-cli'),
  });
  console.log(JSON.stringify({ action: 'unassign', assignment, production: compactResult(result) }, null, 2));
  if (result.blockers.length) process.exitCode = 2;
}

async function requestChange() {
  const weekStart = resolveWeekStart(arg('--week'));
  if (!weekStart) throw new Error('--week must be a valid YYYY-MM-DD date');
  const input = {
    weekStart,
    customerName: requireArg('--customer'),
    requestedChange: requireArg('--text'),
    source: 'operator',
    sourceReference: arg('--reference'),
  };
  if (!has('--apply')) {
    console.log(JSON.stringify({ mode: 'dry-run', action: 'request', ...input }, null, 2));
    return;
  }
  const request = await recordChangeRequest({ prisma, ...input });
  const result = await syncMealPrepWeek({
    prisma,
    weekStart,
    supabaseUid: arg('--uid', process.env.HUB_MASTER_SUPABASE_UID || null),
    apply: true,
    createdBy: arg('--actor', process.env.USER || process.env.USERNAME || 'meal-prep-production-cli'),
  });
  console.log(JSON.stringify({ action: 'request', request, production: compactResult(result) }, null, 2));
  if (result.blockers.length) process.exitCode = 2;
}

async function resolveRequest() {
  const weekStart = resolveWeekStart(arg('--week'));
  if (!weekStart) throw new Error('--week must be a valid YYYY-MM-DD date');
  const input = {
    weekStart,
    customerName: requireArg('--customer'),
    requestId: requireArg('--request'),
    resolution: requireArg('--resolution'),
  };
  if (!has('--apply')) {
    console.log(JSON.stringify({ mode: 'dry-run', action: 'resolve-request', ...input }, null, 2));
    return;
  }
  const request = await resolveChangeRequest({ prisma, ...input });
  const result = await syncMealPrepWeek({
    prisma,
    weekStart,
    supabaseUid: arg('--uid', process.env.HUB_MASTER_SUPABASE_UID || null),
    apply: true,
    createdBy: arg('--actor', process.env.USER || process.env.USERNAME || 'meal-prep-production-cli'),
  });
  console.log(JSON.stringify({ action: 'resolve-request', request, production: compactResult(result) }, null, 2));
  if (result.blockers.length) process.exitCode = 2;
}

async function main() {
  if (command === 'sync') return sync();
  if (command === 'show') return show();
  if (command === 'assign') return assign();
  if (command === 'unassign') return unassign();
  if (command === 'request') return requestChange();
  if (command === 'resolve-request') return resolveRequest();
  throw new Error(`Unknown command "${command}". Use sync, show, assign, unassign, request, or resolve-request.`);
}

main()
  .catch((error) => {
    console.error(`[meal-prep-production] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
