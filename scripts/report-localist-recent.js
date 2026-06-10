require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const events = await prisma.ledgerEvent.findMany({
    where: {
      source: 'hub_localist',
      eventType: {
        in: [
          'localist.checkout.started',
          'localist.checkout.success',
          'localist.cart.updated',
        ],
      },
      occurredAt: { gte: since },
      tombstonedAt: null,
    },
    orderBy: { occurredAt: 'asc' },
    take: 1000,
  });

  const bySession = new Map();
  for (const event of events) {
    const payload = event.payload || {};
    const sessionId = payload.sessionId || '(no session)';
    if (!bySession.has(sessionId)) {
      bySession.set(sessionId, {
        sessionId,
        visitorId: payload.visitorId || null,
        checkoutStarted: 0,
        checkoutSuccess: 0,
        latestCart: null,
        events: [],
      });
    }
    const row = bySession.get(sessionId);
    if (event.eventType === 'localist.checkout.started') row.checkoutStarted += 1;
    if (event.eventType === 'localist.checkout.success') row.checkoutSuccess += 1;
    if (event.eventType === 'localist.cart.updated') {
      row.latestCart = {
        occurredAt: event.occurredAt,
        cart: payload.cart || null,
      };
    }
    row.events.push({
      id: event.id,
      occurredAt: event.occurredAt,
      eventType: event.eventType,
      payload,
    });
  }

  console.log(JSON.stringify({
    since: since.toISOString(),
    eventCount: events.length,
    sessions: Array.from(bySession.values()),
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
