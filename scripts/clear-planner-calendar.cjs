const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnv(path.resolve(__dirname, '..', '.env'));
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();
  const cards = await prisma.plannerCard.findMany({ orderBy: [{ supabaseUid: 'asc' }, { date: 'asc' }] });
  const summary = cards.reduce((result, card) => {
    const key = card.supabaseUid;
    if (!result[key]) result[key] = { cards: 0, revenue: 0, labor: 0, firstDate: card.date, lastDate: card.date };
    result[key].cards += 1;
    result[key].revenue += card.revenue || 0;
    result[key].labor += card.cost || 0;
    result[key].lastDate = card.date;
    return result;
  }, {});

  if (!apply) {
    console.log(JSON.stringify({ mode: 'dry-run', totalCards: cards.length, calendars: summary }, null, 2));
    await prisma.$disconnect();
    return;
  }

  const backupDir = path.resolve('C:\\tmp');
  if (backupDir !== path.resolve('C:\\tmp')) throw new Error('Unsafe backup path');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `planner-calendar-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ exportedAt: new Date().toISOString(), cards }, null, 2));

  const deleted = await prisma.$transaction(async (tx) => tx.plannerCard.deleteMany({}));
  const remaining = await prisma.plannerCard.count();
  await prisma.$disconnect();
  if (remaining !== 0) throw new Error(`Calendar clear incomplete: ${remaining} cards remain`);
  console.log(JSON.stringify({ mode: 'applied', deleted: deleted.count, remaining, backupPath, calendars: summary }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
