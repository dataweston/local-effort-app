const { prisma } = require('../_lib/prisma');
const { methodNotAllowed, asIso, cleanString, tableMissing } = require('./_http');
const { enforcePublicRateLimit, PUBLIC_RATE_LIMITS } = require('./_publicRateLimit');


const THREAD_TYPE = 'hub_localist';
const THREAD_ID = 'public-localist';
const THREAD_SINGLETON_KEY = 'hub-localist-public-chat';

async function getLocalistThread() {
  return prisma.objectThread.upsert({
    where: { singletonKey: THREAD_SINGLETON_KEY },
    create: {
      singletonKey: THREAD_SINGLETON_KEY,
      objectType: THREAD_TYPE,
      objectId: THREAD_ID,
      visibility: 'public',
      title: 'Localist Chat',
    },
    update: { singletonKey: THREAD_SINGLETON_KEY },
  });
}

function publicMessage(message) {
  return {
    id: message.id,
    senderName: message.senderRole || 'Guest',
    body: message.body || '',
    attachments: [],
    createdAt: asIso(message.createdAt),
  };
}


module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'POST' && !await enforcePublicRateLimit(req, res, PUBLIC_RATE_LIMITS.chat)) return;

    const thread = await getLocalistThread();

    if (req.method === 'POST') {
      const senderName = cleanString(req.body?.senderName, 60);
      const body = cleanString(req.body?.body, 1000) || '';
      if (req.body?.imageUpload != null || cleanString(req.body?.imageUrl, 1000)) {
        return res.status(400).json({ error: 'Public chat supports text messages only' });
      }
      if (!senderName) return res.status(400).json({ error: 'Name is required' });
      if (!body) return res.status(400).json({ error: 'Message is required' });
      const message = await prisma.objectThreadMessage.create({
        data: {
          threadId: thread.id,
          senderRole: senderName,
          body,
          attachments: undefined,
        },
      });

      await prisma.objectThread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      }).catch(() => {});

      return res.status(201).json({ ok: true, message: publicMessage(message) });
    }

    const messages = await prisma.objectThreadMessage.findMany({
      where: { threadId: thread.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      messages: messages.reverse().map(publicMessage),
    });
  } catch (err) {
    console.error('[hub/localist-chat] error', err);
    if (tableMissing(err)) {
      return res.status(503).json({ error: 'Localist chat storage is not ready. Run Prisma migrations.' });
    }
    return res.status(500).json({ error: 'Unable to load Localist chat' });
  }
};
