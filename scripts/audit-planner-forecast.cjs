require('dotenv').config();

const { prisma } = require('../backend/api/utils/prisma');
const { buildPlannerForecast } = require('../backend/api/planner/forecast');

async function main() {
  if (!prisma) throw new Error('Planner database is unavailable');
  const plannerUid = process.env.HUB_MASTER_SUPABASE_UID || process.env.VITE_HUB_MASTER_SUPABASE_UID;
  const result = await buildPlannerForecast({ prisma, plannerUid });
  console.log(JSON.stringify({
    generatedAt: result.generatedAt,
    methodology: result.methodology,
    months: result.months,
    square: {
      recurringMonthlyCents: result.sources.square.recurringMonthlyCents,
      recurringSeriesCount: result.sources.square.recurringSeriesCount,
      scheduledOneOffCents: result.sources.square.scheduledOneOffCents,
    },
    happyMonday: {
      futureOrderCount: result.sources.happyMonday.futureOrderCount,
      forecastByMonth: result.sources.happyMonday.forecastByMonth,
    },
    localBudget: result.sources.localBudget,
    planner: result.sources.planner,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
    process.exit();
  });
