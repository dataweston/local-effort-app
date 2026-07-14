require('dotenv').config();

const { prisma } = require('../backend/api/utils/prisma');
const { promoteEligibleMealPrepCustomers } = require('../api-handlers/hub/_mealPrepLifecycle');

async function main() {
  if (!prisma) throw new Error('Database unavailable');
  const apply = process.argv.includes('--apply');
  const result = await promoteEligibleMealPrepCustomers(prisma, { dryRun: !apply });
  console.log(JSON.stringify({
    mode: apply ? 'applied' : 'dry-run',
    eligible: result.eligible,
    promoted: result.promoted,
    matches: result.matches.map(({ customer, evidence }) => ({
      customerId: customer.id,
      customerName: customer.name,
      preferredStartDate: customer.properties?.preferredStartDate || null,
      evidenceEventId: evidence.id,
      evidenceOccurredAt: evidence.occurredAt,
      amountCents: Number(evidence.payload?.totalCents ?? evidence.payload?.amountCents ?? 0),
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
