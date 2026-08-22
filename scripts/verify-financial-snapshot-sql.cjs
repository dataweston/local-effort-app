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
const sqlPath = path.resolve('artifacts/financial-snapshot/source-query.sql');
const outputPath = path.resolve('artifacts/financial-snapshot/raw/monthly-sql-verification.json');

async function main() {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const rows = await db.$queryRawUnsafe(sql);
  const serializable = rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, typeof value === 'object' && value !== null && 'toNumber' in value ? value.toNumber() : value])
  ));
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), sqlPath: path.relative(process.cwd(), sqlPath), rows: serializable }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, rowCount: serializable.length, first: serializable[0], last: serializable.at(-1) }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
