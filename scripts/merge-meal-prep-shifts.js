// Meal prep cleanup (2026-06-12):
// 1. Seed the rolling weekly meal prep notepad tabs (Sun/Mon pairs) as hub docs.
// 2. "Prep shift" (Maria) and unassigned "Meal prep" cards are the same
//    position: retitle Maria's cards to "Meal prep" and delete the duplicate
//    unassigned Sat/Sun open cards on dates she covers.
// 3. Assigned shifts must not be up for pickup unless given away: clear the
//    optional flag on assigned Meal prep / Prep shift cards.
//
// Usage: node scripts/merge-meal-prep-shifts.js --apply   (dry run without --apply)
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const UID = '57063b69-34ba-4779-9321-0ebb47c4c19d'; // weeklydemo master planner

const WEEK_STARTS = ['2026-06-14', '2026-06-21', '2026-06-28']; // upcoming Sundays

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

async function seedWeekDocs() {
  for (const weekStart of WEEK_STARTS) {
    const sourceId = `weekly-meal-prep:week-${weekStart}`;
    const title = `Weekly Meal Prep — ${pairTitle(weekStart)}`;
    const existing = await prisma.hubDocument.findFirst({ where: { source: 'drafts', sourceId } });
    if (existing) {
      console.log(`- notes: ${sourceId} already exists (${existing.status})`);
      continue;
    }
    if (apply) {
      await prisma.hubDocument.create({
        data: {
          title,
          body: `# Menu — ${pairTitle(weekStart)}\n\n# Production\n\n# Packout / Delivery\n`,
          summary: 'Shared weekly meal prep menu. Falls off the notepad on Tuesday and archives to the brain.',
          visibility: 'staff',
          category: 'weekly-meal-prep',
          tags: ['weekly-meal-prep', 'drafts'],
          status: 'published',
          source: 'drafts',
          sourceId,
        },
      });
    }
    console.log(`- notes: ${apply ? 'seeded' : 'would seed'} tab "${pairTitle(weekStart)}" (${sourceId})`);
  }
}

async function mergeShifts() {
  const renamed = await (apply
    ? prisma.plannerCard.updateMany({
        where: { supabaseUid: UID, title: 'Prep shift' },
        data: { title: 'Meal prep' },
      })
    : prisma.plannerCard.count({ where: { supabaseUid: UID, title: 'Prep shift' } }));
  console.log(`- merge: ${apply ? 'retitled' : 'would retitle'} ${renamed.count ?? renamed} "Prep shift" cards to "Meal prep"`);

  const mariaDates = (await prisma.plannerCard.findMany({
    where: { supabaseUid: UID, templateId: { startsWith: 'prep-maria-' } },
    select: { date: true },
  })).map((card) => card.date);

  const duplicates = await prisma.plannerCard.findMany({
    where: {
      supabaseUid: UID,
      templateId: { in: ['canonical-sat-meal-prep-open', 'canonical-sun-meal-prep-open'] },
      date: { in: mariaDates },
    },
    select: { id: true, date: true, templateId: true },
  });
  if (apply && duplicates.length) {
    await prisma.plannerCard.deleteMany({ where: { id: { in: duplicates.map((card) => card.id) } } });
  }
  console.log(`- merge: ${apply ? 'deleted' : 'would delete'} ${duplicates.length} duplicate unassigned "Meal prep" open cards on Maria's dates`);
}

async function clearUpFlagOnAssigned() {
  const where = {
    supabaseUid: UID,
    title: { in: ['Meal prep', 'Prep shift'] },
    optional: true,
    NOT: { people: { isEmpty: true } },
  };
  const count = await prisma.plannerCard.count({ where });
  if (apply && count) {
    await prisma.plannerCard.updateMany({ where, data: { optional: false, status: 'todo' } });
  }
  console.log(`- shifts: ${apply ? 'cleared' : 'would clear'} the up-for-pickup flag on ${count} assigned cards`);

  const stillOpen = await prisma.plannerCard.count({
    where: { supabaseUid: UID, title: { in: ['Meal prep', 'Prep shift'] }, people: { isEmpty: true }, zone: 'timed' },
  });
  console.log(`- shifts: ${stillOpen} unassigned meal prep cards remain open for pickup`);
}

(async () => {
  console.log(`Meal prep merge (${apply ? 'APPLY' : 'DRY RUN'})`);
  await seedWeekDocs();
  await mergeShifts();
  await clearUpFlagOnAssigned();
})()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
