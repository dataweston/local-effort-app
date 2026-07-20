require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const entity = await prisma.brainEntity.findFirst({
    where: { entityType: 'Person', name: { equals: 'Maria Beck', mode: 'insensitive' }, tombstonedAt: null },
  });
  if (!entity) throw new Error('Maria Beck Person entity not found');

  const payrollEvidence = {
    hourlyRateCents: 3500,
    documentedHours: 44,
    documentedGrossCents: 154000,
    payrollAsOf: '2026-06-15',
    payrollEvidenceSource: 'Four supplied Square Payroll stubs summarized in docs/le-economist-fact-audit-2026-07-18.md',
    payrollEvidenceStatus: 'exact_document_evidence',
    payrollLimitations: 'Excludes employer taxes, deductions, reimbursements, payroll adjustments, and later owner-reported pay not present in the supplied stubs.',
  };
  const properties = { ...(entity.properties || {}), ...payrollEvidence };
  if (apply) await prisma.brainEntity.update({ where: { id: entity.id }, data: { properties } });
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry_run', entityId: entity.id, payrollEvidence }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
