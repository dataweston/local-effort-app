#!/usr/bin/env node
require('dotenv').config();

const { PrismaClient } = require(process.env.PRISMA_CLIENT_MODULE || '@prisma/client');
const {
  eventWorkBlockSpecs,
  reconcilePlannerWorkBlocks,
} = require('../backend/api/planner/workBlocks');
const { projectPlannerCommercialLedger } = require('../backend/api/planner/commercialLedger');
const { projectPlannerEvidence } = require('../backend/api/planner/evidenceReconciliation');
const { syncPlannerWorkBlocks } = require('../backend/api/planner/googleCalendarSync');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function argumentValue(args, name) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function parseArgs(argv, env = process.env) {
  const known = new Set(['--apply', '--calendar']);
  for (const arg of argv) {
    if (!known.has(arg) && !/^--(?:uid|from|to)=/.test(arg))
      throw new Error(`Unknown argument: ${arg}`);
  }

  const plannerUid =
    argumentValue(argv, 'uid') || env.HUB_MASTER_SUPABASE_UID || env.VITE_HUB_MASTER_SUPABASE_UID;
  if (!plannerUid) throw new Error('HUB_MASTER_SUPABASE_UID or --uid=<planner uid> is required');

  const from = argumentValue(argv, 'from');
  const to = argumentValue(argv, 'to');
  if (from && !ISO_DATE.test(from)) throw new Error('--from must use YYYY-MM-DD');
  if (to && !ISO_DATE.test(to)) throw new Error('--to must use YYYY-MM-DD');
  if (from && to && from > to) throw new Error('--from cannot be after --to');

  return {
    apply: argv.includes('--apply'),
    calendar: argv.includes('--calendar'),
    plannerUid,
    from,
    to,
  };
}

function proposedWorkBlockSummary(cards) {
  const specs = cards.flatMap(eventWorkBlockSpecs);
  const byStatus = {};
  const byType = {};
  for (const spec of specs) {
    byStatus[spec.status] = (byStatus[spec.status] || 0) + 1;
    byType[spec.blockType] = (byType[spec.blockType] || 0) + 1;
  }
  return { total: specs.length, byType, byStatus };
}

async function loadState(prisma, plannerUid) {
  const [cards, workBlocks] = await Promise.all([
    prisma.plannerCard.findMany({
      where: { supabaseUid: plannerUid },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    }),
    prisma.plannerWorkBlock.findMany({ where: { supabaseUid: plannerUid } }),
  ]);
  return { cards, workBlocks };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const before = await loadState(prisma, options.plannerUid);
    const eventCards = before.cards.filter((card) => card.objectType === 'event');
    const summary = {
      mode: options.apply ? 'apply' : 'dry-run',
      plannerUid: options.plannerUid,
      cards: before.cards.length,
      eventCards: eventCards.length,
      proposedWorkBlocks: proposedWorkBlockSummary(eventCards),
      before: {
        workBlocks: before.workBlocks.length,
      },
    };

    if (!options.apply) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const workBlocks = await prisma.$transaction(
      (tx) => reconcilePlannerWorkBlocks(tx, options.plannerUid, before.cards, []),
      { timeout: 60000 }
    );
    const commercial = await projectPlannerCommercialLedger({
      prisma,
      plannerUid: options.plannerUid,
    });
    const evidence = await projectPlannerEvidence({
      prisma,
      plannerUid: options.plannerUid,
    });
    const calendar = options.calendar
      ? await syncPlannerWorkBlocks({
          prismaClient: prisma,
          plannerUid: options.plannerUid,
          from: options.from,
          to: options.to,
        })
      : null;
    const after = await loadState(prisma, options.plannerUid);

    Object.assign(summary, {
      reconciledWorkBlocks: workBlocks.length,
      commercial,
      evidence,
      calendar,
      after: {
        workBlocks: after.workBlocks.length,
      },
    });
    console.log(JSON.stringify(summary, null, 2));

    if (!commercial.ok || !evidence.ok || (calendar && !calendar.ok)) process.exitCode = 1;
    if (calendar && calendar.processed === 250) {
      console.error(
        '[reconcile-planner-operations] calendar batch reached the 250-block limit; run again to continue pending work'
      );
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[reconcile-planner-operations] failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, proposedWorkBlockSummary };
