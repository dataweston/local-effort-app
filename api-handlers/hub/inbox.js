const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer } = require('./_auth');
const { methodNotAllowed, asIso, cleanString, safePrisma } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

function publicBrainInboxItem(item) {
  return {
    id: `brain_inbox:${item.id}`,
    type: 'brain_inbox',
    title: item.rawContent.slice(0, 80),
    preview: item.rawContent,
    status: item.status,
    source: item.source,
    capturedAt: asIso(item.capturedAt),
    objectType: null,
    objectId: null,
    metadata: {
      resultEntityId: item.resultEntityId || null,
      processedAt: asIso(item.processedAt),
    },
  };
}

function publicHubCapture(item) {
  return {
    id: `hub_capture:${item.id}`,
    type: 'hub_capture',
    title: item.rawContent.slice(0, 80),
    preview: item.rawContent,
    status: item.status,
    source: item.source,
    capturedAt: asIso(item.occurredAt || item.createdAt),
    objectType: item.objectType || null,
    objectId: item.objectId || null,
    metadata: {
      captureIntent: item.captureIntent,
      visibility: item.visibility || null,
      spaceId: item.spaceId || null,
      ledgerEventId: item.ledgerEventId || null,
      routingSuggestions: item.routingSuggestions || null,
    },
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const status = cleanString(req.query?.status, 40);
  const limit = Math.max(1, Math.min(Number(req.query?.limit) || 50, 100));
  const actorId = auth.viewer.userId || auth.viewer.supabaseUid;

  try {
    const [brainItems, captures] = await Promise.all([
      auth.isAdmin
        ? prisma.brainInboxItem.findMany({
            where: status ? { status } : { status: 'pending' },
            orderBy: { capturedAt: 'desc' },
            take: limit,
          })
        : Promise.resolve([]),
      safePrisma([], () => prisma.hubCapture.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(auth.isAdmin ? {} : { actorId }),
        },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      })),
    ]);

    const items = [
      ...brainItems.map(publicBrainInboxItem),
      ...captures.map(publicHubCapture),
    ].sort((a, b) => String(b.capturedAt || '').localeCompare(String(a.capturedAt || ''))).slice(0, limit);

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      items,
    });
  } catch (err) {
    console.error('[hub/inbox] error', err);
    return res.status(500).json({ error: 'Unable to load hub inbox' });
  }
};
