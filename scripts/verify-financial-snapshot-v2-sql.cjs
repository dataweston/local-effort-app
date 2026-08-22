const fs = require('fs');
const path = require('path');

const LOCAL_BUDGET_ROOT = 'C:\\Users\\user\\Local Budget';
const { PrismaClient } = require(path.join(LOCAL_BUDGET_ROOT, 'node_modules', '@prisma', 'client'));

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(LOCAL_BUDGET_ROOT, '.env.local'));
loadEnv(path.join(LOCAL_BUDGET_ROOT, '.env'));
const db = new PrismaClient();

async function main() {
  const sqlPath = path.resolve('artifacts/financial-snapshot-v2/source-query.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const rows = await db.$queryRawUnsafe(sql);
  const counts = rows.reduce((acc, row) => {
    acc[row.record_type] = (acc[row.record_type] || 0) + 1;
    return acc;
  }, {});
  const output = { generatedAt: new Date().toISOString(), sqlPath: path.relative(process.cwd(), sqlPath), rowCount: rows.length, counts };
  const outputPath = path.resolve('artifacts/financial-snapshot-v2/source-query-verification.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, ...output }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
