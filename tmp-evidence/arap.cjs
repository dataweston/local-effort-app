'use strict';
// READ-ONLY evidence dump for internal AR/AP. No writes.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const UID = process.env.HUB_MASTER_SUPABASE_UID;

async function main() {
  const out = {};
  out.uid = UID ? `${UID.slice(0, 8)}…(len ${UID.length})` : null;

  // counts across whole tables (to see how much is planner vs other)
  out.counts = {
    plannerCard: await prisma.plannerCard.count(),
    plannerCardMaster: await prisma.plannerCard.count({ where: { supabaseUid: UID } }),
    plannerCOGS: await prisma.plannerCOGS.count(),
    plannerCOGSMaster: await prisma.plannerCOGS.count({ where: { supabaseUid: UID } }),
    plannerWorkBlock: await prisma.plannerWorkBlock.count(),
    commercialOrder: await prisma.commercialOrder.count(),
    commercialInvoice: await prisma.commercialInvoice.count(),
    financeCostObligation: await prisma.financeCostObligation.count(),
    financeCostPayment: await prisma.financeCostPayment.count(),
    financePaymentTransaction: await prisma.financePaymentTransaction.count(),
    financePaymentAllocation: await prisma.financePaymentAllocation.count(),
    plannerOverhead: await prisma.plannerOverhead.count(),
  };

  out.orderStatusBySource = await prisma.$queryRawUnsafe(
    `select "sourceSystem", status, count(*)::int as n, sum("totalCents")::bigint as cents,
            min("serviceStartAt") as min_service, max("serviceStartAt") as max_service
       from "CommercialOrder" group by 1,2 order by 1,2`
  );
  out.invoiceStatusBySource = await prisma.$queryRawUnsafe(
    `select i."sourceSystem", i.status, count(*)::int as n,
            sum(i."totalCents")::bigint as total_cents, sum(i."outstandingCents")::bigint as outstanding_cents
       from "CommercialInvoice" i group by 1,2 order by 1,2`
  );
  out.obligationStatusBySource = await prisma.$queryRawUnsafe(
    `select "sourceSystem", status, "obligationType", count(*)::int as n,
            sum("amountCents")::bigint as amount_cents, sum("outstandingCents")::bigint as outstanding_cents
       from "FinanceCostObligation" group by 1,2,3 order by 1,2,3`
  );

  // full order + invoice + allocation graph
  out.orders = await prisma.commercialOrder.findMany({
    include: {
      invoices: { include: { allocations: { include: { transaction: true } } } },
      lines: { select: { id: true, name: true, totalCents: true, lineType: true } },
    },
    orderBy: [{ serviceStartAt: 'asc' }, { createdAt: 'asc' }],
  });

  out.obligations = await prisma.financeCostObligation.findMany({
    include: { payments: true },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
  });

  out.cards = await prisma.plannerCard.findMany({
    where: { supabaseUid: UID },
    select: {
      id: true, title: true, date: true, objectType: true, status: true,
      financialStatus: true, financialSource: true, financialMetadata: true,
      revenue: true, revenueCents: true, cost: true, costCents: true,
      cashReceivedCents: true, enabled: true, optional: true, templateId: true,
      createdAt: true, updatedAt: true,
    },
    orderBy: [{ date: 'asc' }],
  });
  out.cardsOtherUidCount = await prisma.plannerCard.count({ where: { NOT: { supabaseUid: UID } } });
  out.cardsOtherUids = await prisma.$queryRawUnsafe(
    `select "supabaseUid", count(*)::int as n, min(date) as min_date, max(date) as max_date from "PlannerCard" group by 1 order by 2 desc`
  );

  out.cogs = await prisma.plannerCOGS.findMany({ orderBy: [{ weekStart: 'asc' }] });

  out.transactions = await prisma.financePaymentTransaction.findMany({
    orderBy: [{ occurredAt: 'asc' }],
  });
  out.allocations = await prisma.financePaymentAllocation.findMany();
  out.overheads = await prisma.plannerOverhead.findMany();

  process.stdout.write(
    JSON.stringify(out, (k, v) => (typeof v === 'bigint' ? Number(v) : v), 1)
  );
}

main()
  .catch((e) => {
    console.error('ERR', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
