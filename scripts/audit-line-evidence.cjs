#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('=');
    if (at < 1) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function cleanDatabaseUrl(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '').replace(/^[A-Z_]+=/, '').replace(/^["']|["']$/g, '');
}

async function main() {
  const repo = path.resolve(__dirname, '..');
  for (const name of ['.env', '.env.local', '.env.vercel.production']) loadEnv(path.join(repo, name));
  const { PrismaClient } = require('@prisma/client');
  const budgetUrl = cleanDatabaseUrl(process.env.LOCAL_BUDGET_DATABASE_URL);
  if (!budgetUrl) throw new Error('LOCAL_BUDGET_DATABASE_URL is required');
  const budget = new PrismaClient({ datasources: { db: { url: budgetUrl } } });
  const brain = new PrismaClient();
  const start = process.argv[2] || '2026-04-01';
  const end = process.argv[3] || '2026-07-01';
  const summaryOnly = process.argv.includes('--summary');
  const squareOnly = process.argv.includes('--square');

  try {
    const budgetRows = await budget.$queryRawUnsafe(`
      SELECT
        t.id, t.date, t.type::text AS direction,
        COALESCE(NULLIF(t."merchantName", ''), 'Unknown merchant') AS merchant,
        COALESCE(NULLIF(t."userDescription", ''), NULLIF(t.description, ''), '') AS description,
        COALESCE(sc.name, c.name, 'Uncategorized') AS category,
        COALESCE(
          s.classification::text,
          sc."defaultClassification"::text,
          t.classification::text,
          c."defaultClassification"::text,
          CASE WHEN t.type::text = 'TRANSFER' THEN 'TRANSFER' ELSE 'UNKNOWN' END
        ) AS classification,
        ABS(CASE WHEN s.id IS NULL THEN t.amount ELSE s.amount END) AS amount
      FROM transactions t
      LEFT JOIN categories c ON c.id = t."categoryId"
      LEFT JOIN transaction_splits s ON s."transactionId" = t.id
      LEFT JOIN categories sc ON sc.id = s."categoryId"
      WHERE t.date >= $1::date AND t.date < $2::date
        AND t.status::text = 'POSTED'
        AND (
          COALESCE(s.classification::text, sc."defaultClassification"::text, t.classification::text, c."defaultClassification"::text, '') = 'COGS'
          OR COALESCE(t."merchantName", '') ~* '(baker|accell|thumbtack|happy monday)'
          OR COALESCE(t.description, '') ~* '(baker|accell|thumbtack|happy monday)'
          OR COALESCE(t."userDescription", '') ~* '(baker|accell|thumbtack|happy monday)'
        )
      ORDER BY t.date, t.id
    `, start, end);

    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T00:00:00.000Z`);
    const [orders, csvEvents, relatedEvents, relatedEntities] = await Promise.all([
      brain.ledgerEvent.findMany({
        where: { eventType: 'order.placed', source: 'square', tombstonedAt: null, occurredAt: { gte: startDate, lt: endDate } },
        select: { id: true, sourceId: true, occurredAt: true, payload: true },
        orderBy: { occurredAt: 'asc' },
      }),
      brain.ledgerEvent.findMany({
        where: { eventType: 'extraction.square_csv', tombstonedAt: null, occurredAt: { gte: startDate, lt: endDate } },
        select: { id: true, occurredAt: true, payload: true },
        orderBy: { occurredAt: 'asc' },
      }),
      brain.$queryRawUnsafe(`
        SELECT id, "eventType", source, "sourceId", "occurredAt", payload
        FROM "LedgerEvent"
        WHERE "tombstonedAt" IS NULL
          AND "occurredAt" >= $1::timestamptz AND "occurredAt" < $2::timestamptz
          AND payload::text ~* '(happy monday|baker.?s field|accell|thumbtack)'
        ORDER BY "occurredAt"
        LIMIT 500
      `, startDate, endDate),
      brain.$queryRawUnsafe(`
        SELECT e.id, e."entityType", e.name, e.properties,
          COALESCE(json_agg(a.alias) FILTER (WHERE a.alias IS NOT NULL), '[]'::json) AS aliases
        FROM "BrainEntity" e
        LEFT JOIN "BrainEntityAlias" a ON a."entityId" = e.id
        WHERE e."tombstonedAt" IS NULL
          AND (e.name ~* '(happy monday|baker.?s field|accell|thumbtack)' OR a.alias ~* '(happy monday|baker.?s field|accell|thumbtack)')
        GROUP BY e.id, e."entityType", e.name, e.properties
        ORDER BY e."entityType", e.name
      `),
    ]);

    const csvByTxn = new Map(csvEvents.map((event) => [event.payload?.txnId, event.payload]));
    const square = orders.map((event) => ({
      date: event.occurredAt.toISOString(),
      orderId: event.payload?.orderId || event.sourceId,
      total: Number(event.payload?.totalCents || 0) / 100,
      lineItems: event.payload?.lineItems || [],
      identitySignals: event.payload?.identitySignals || {},
      csv: csvByTxn.get(event.payload?.orderId || event.sourceId) || null,
    }));

    if (squareOnly) {
      console.log(JSON.stringify(square.map((row) => ({
        date: row.date,
        orderId: row.orderId,
        total: row.total,
        customerName: row.csv?.customerName || null,
        buyerEmails: row.identitySignals?.buyerEmails || [],
        customerIds: [row.identitySignals?.orderCustomerId, ...(row.identitySignals?.paymentCustomerIds || [])].filter(Boolean),
        lineItems: row.lineItems.map((item) => ({ name: item.name, quantity: item.quantity, total: Number(item.totalCents || 0) / 100 })),
      })), null, 2));
      return;
    }

    if (summaryOnly) {
      const budgetGroups = new Map();
      for (const row of budgetRows) {
        const key = `${row.merchant}|${row.classification}|${row.category}`;
        const item = budgetGroups.get(key) || {
          merchant: row.merchant, classification: row.classification, category: row.category,
          amount: 0, dates: [], transactionIds: [],
        };
        item.amount += Number(row.amount);
        item.dates.push(row.date.toISOString().slice(0, 10));
        item.transactionIds.push(row.id);
        budgetGroups.set(key, item);
      }
      const invoiceAmounts = new Set([1357.40, 663.10, 2326.30, 1463.65, 384.35]);
      console.log(JSON.stringify({
        period: { start, endExclusive: end },
        localBudgetGroups: [...budgetGroups.values()]
          .filter((row) => /baker|accell|thumbtack/i.test(row.merchant))
          .map((row) => ({ ...row, amount: Math.round(row.amount * 100) / 100 })),
        happyMondaySquareCandidates: square.filter((row) => {
          const customer = String(row.csv?.customerName || '');
          const labels = row.lineItems.map((item) => item.name).join(' ');
          return /happy monday/i.test(`${customer} ${labels}`) || invoiceAmounts.has(Math.round(row.total * 100) / 100);
        }).map((row) => ({
          date: row.date, orderId: row.orderId, total: row.total,
          customerName: row.csv?.customerName || null,
          csvAmount: row.csv?.amount || null,
          lineItems: row.lineItems.map((item) => ({ name: item.name, quantity: item.quantity, totalCents: item.totalCents })),
          identitySignals: row.identitySignals,
        })),
        evidenceEvents: relatedEvents.map((event) => ({
          id: event.id, eventType: event.eventType, source: event.source,
          sourceId: event.sourceId, occurredAt: event.occurredAt,
          payload: {
            merchantName: event.payload?.merchantName,
            amountCents: event.payload?.amountCents,
            classification: event.payload?.classification,
            name: event.payload?.name,
            knownCost: event.payload?.knownCost,
            costUnit: event.payload?.costUnit,
            vendor: event.payload?.vendor,
            subject: event.payload?.subject,
            sentBodyPreview: String(event.payload?.sentBodyPreview || '').slice(0, 1200),
            bodyPreview: String(event.payload?.bodyPreview || '').slice(0, 1200),
          },
        })),
        relatedEntities: relatedEntities.filter((entity) => ['Customer', 'Dish', 'Vendor'].includes(entity.entityType)),
      }, null, 2));
      return;
    }

    console.log(JSON.stringify({
      period: { start, endExclusive: end },
      localBudget: budgetRows.map((row) => ({ ...row, amount: Number(row.amount) })),
      square,
      relatedEvents,
      relatedEntities,
    }, null, 2));
  } finally {
    await Promise.allSettled([budget.$disconnect(), brain.$disconnect()]);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
