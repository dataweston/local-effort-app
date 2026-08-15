const { PrismaClient } = require('@prisma/client');

const SUMMARY_ONLY = process.argv.includes('--summary');

for (const file of ['.env', '.env.local', '.env.production.local', '.env.vercel.production']) {
  require('dotenv').config({ path: file, override: false });
}

function displayTransaction(transaction) {
  return {
    id: transaction.id,
    date: transaction.date,
    amount: transaction.amount,
    type: transaction.type,
    status: transaction.status,
    classification: transaction.classification,
    effectiveClassification: transaction.effectiveClassification,
    categoryName: transaction.categoryName,
    merchantName: transaction.merchantName,
    description: transaction.description,
    externalId: transaction.externalId,
    accountId: transaction.accountId,
  };
}

async function main() {
  if (!process.env.LOCAL_BUDGET_DATABASE_URL || !process.env.DATABASE_URL) {
    throw new Error('LOCAL_BUDGET_DATABASE_URL and DATABASE_URL are required');
  }

  const brain = new PrismaClient();
  const localBudget = new PrismaClient({
    datasources: { db: { url: process.env.LOCAL_BUDGET_DATABASE_URL } },
  });

  try {
    const transactions = await localBudget.$queryRawUnsafe(`
      SELECT
        t.id::text,
        t.date,
        t.amount::text,
        t.type::text,
        t.status::text,
        t.classification::text,
        COALESCE(t.classification::text, c."defaultClassification"::text) AS "effectiveClassification",
        c.name AS "categoryName",
        t."merchantName",
        t.description,
        t."externalId",
        t."accountId"::text
      FROM transactions t
      LEFT JOIN categories c ON c.id = t."categoryId"
      WHERE t.type::text = 'INCOME'
        AND lower(
          coalesce(t."merchantName", '') || ' ' ||
          coalesce(t.description, '') || ' ' ||
          coalesce(t."userDescription", '') || ' ' ||
          coalesce(t."externalId", '')
        ) LIKE '%sanjay%'
      ORDER BY t.date DESC
      LIMIT 200
    `);

    const ledgerEvents = await brain.ledgerEvent.findMany({
      where: {
        source: 'local_budget',
        eventType: 'payment.received',
        OR: [
          { payload: { path: ['description'], string_contains: 'Sanjay' } },
          { payload: { path: ['merchantName'], string_contains: 'Sanjay' } },
        ],
      },
      select: { id: true, occurredAt: true, sourceId: true, payload: true },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });

    const matchedAccountIds = [...new Set(transactions.map((transaction) => transaction.accountId))];
    const accountCoverage = matchedAccountIds.length
      ? await localBudget.$queryRawUnsafe(`
          SELECT "accountId"::text, MIN(date) AS "earliestTransaction", MAX(date) AS "latestTransaction", COUNT(*)::int AS "transactionCount"
          FROM transactions
          WHERE "accountId"::text = ANY($1::text[])
          GROUP BY "accountId"
        `, matchedAccountIds)
      : [];
    const localBudgetCoverage = await localBudget.$queryRawUnsafe(`
      SELECT MIN(date) AS "earliestTransaction", MAX(date) AS "latestTransaction", COUNT(*)::int AS "transactionCount"
      FROM transactions
    `);

    const latestCashflowInference = await brain.brainInference.findFirst({
      where: { inferenceType: 'CASHFLOW', knownUntil: null, supersededBy: null },
      select: { id: true, computedAt: true, staleAt: true, summary: true },
      orderBy: { computedAt: 'desc' },
    });
    const customer = await brain.brainEntity.findFirst({
      where: { entityType: 'Customer', tombstonedAt: null, name: { equals: 'Sanjay Roy', mode: 'insensitive' } },
      select: { id: true, name: true, localEffortCustomerId: true, properties: true },
    });
    const stripeCustomerId = customer?.properties?.stripeCustomerId || null;
    const nonLocalBudgetPaymentEvidence = stripeCustomerId
      ? await brain.$queryRawUnsafe(`
          SELECT id, "eventType", source, "occurredAt", payload
          FROM "LedgerEvent"
          WHERE "tombstonedAt" IS NULL
            AND source <> 'local_budget'
            AND "eventType" ILIKE '%payment%'
            AND payload::text ILIKE ANY($1::text[])
          ORDER BY "occurredAt"
        `, [`%${stripeCustomerId}%`, '%sanjayroy1309@gmail.com%', '%Victor Sanjay Roy%'])
      : [];
    const coverageGap = await brain.ledgerEvent.findFirst({
      where: {
        eventType: 'customer.payment_history.coverage_gap',
        sourceId: 'sanjay-stripe-history-gap:2024-06-10:2025-02-16',
        tombstonedAt: null,
      },
      select: { id: true, occurredAt: true, payload: true },
    });
    const latestLocalBudgetRuns = await brain.brainJobRun.findMany({
      where: { jobName: 'local-budget-sync' },
      select: {
        startedAt: true,
        finishedAt: true,
        status: true,
        itemsProcessed: true,
        itemsWritten: true,
        errorCount: true,
        detail: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });

    const ledgerByTransactionId = new Map(
      ledgerEvents.map((event) => [event.payload?.localBudgetTxId, event]),
    );
    const missingTransactions = transactions.filter((transaction) => !ledgerByTransactionId.has(transaction.id));
    const attributedEvents = ledgerEvents.filter((event) => event.payload?.customerEntityId);
    const totalCents = transactions.reduce(
      (sum, transaction) => sum + Math.round(Number(transaction.amount) * 100),
      0,
    );
    const duplicateSourceIds = [...new Set(transactions.map((transaction) => transaction.externalId || transaction.id))]
      .filter((sourceId) => transactions.filter((transaction) => (transaction.externalId || transaction.id) === sourceId).length > 1);

    console.log(JSON.stringify({
      ...(SUMMARY_ONLY ? {} : { localBudgetPayments: transactions.map(displayTransaction) }),
      verification: {
        localBudgetPaymentCount: transactions.length,
        brainLedgerPaymentCount: ledgerEvents.length,
        totalCents,
        earliestPayment: transactions.at(-1)?.date || null,
        latestPayment: transactions[0]?.date || null,
        missingCount: missingTransactions.length,
        missingTransactionIds: missingTransactions.map((transaction) => transaction.id),
        duplicateSourceIds,
        attributedCount: attributedEvents.length,
        unattributedCount: ledgerEvents.length - attributedEvents.length,
        unclassifiedCount: transactions.filter((transaction) => !transaction.effectiveClassification).length,
        currentEconomicsModelIncludesAugust: false,
        currentEconomicsModelPeriodEnds: '2026-07-31',
      },
      latestCashflowInference,
      customer: SUMMARY_ONLY ? {
        id: customer?.id || null,
        name: customer?.name || null,
        customerSince: customer?.properties?.mealPrepCustomerSince || customer?.properties?.customerSince || null,
        paymentHistoryCoverage: customer?.properties?.paymentHistoryCoverage || null,
      } : customer,
      nonLocalBudgetPaymentEvidence,
      coverageGap,
      latestLocalBudgetRuns,
      accountCoverage,
      localBudgetCoverage: localBudgetCoverage[0] || null,
    }, null, 2));
  } finally {
    await Promise.all([brain.$disconnect(), localBudget.$disconnect()]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
