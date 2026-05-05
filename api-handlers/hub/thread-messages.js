const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer } = require('./_auth');
const { methodNotAllowed, asIso, cleanString, safePrisma } = require('./_http');
const { allowedVisibility, threadSummary } = require('./threads');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

async function getThread(auth, threadId) {
  const thread = await safePrisma(null, () => prisma.objectThread.findFirst({
    where: {
      id: threadId,
      visibility: { in: allowedVisibility(auth) },
    },
    include: {
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  }));
  return thread;
}

function publicMessage(message) {
  return {
    id: message.id,
    threadId: message.threadId,
    senderId: message.senderId || null,
    senderRole: message.senderRole || null,
    body: message.body,
    attachments: message.attachments || null,
    createdAt: asIso(message.createdAt),
    editedAt: asIso(message.editedAt),
    deletedAt: asIso(message.deletedAt),
  };
}

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const threadId = cleanString(req.params?.id || req.query?.id, 120);
  if (!threadId) return res.status(400).json({ error: 'thread id is required' });

  try {
    const thread = await getThread(auth, threadId);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    if (req.method === 'POST') {
      const body = cleanString(req.body?.body, 6000);
      if (!body) return res.status(400).json({ error: 'body is required' });
      if (thread.visibility === 'admin' && !auth.isAdmin) return res.status(403).json({ error: 'Forbidden' });

      const message = await prisma.objectThreadMessage.create({
        data: {
          threadId,
          senderId: auth.viewer.userId || auth.viewer.supabaseUid,
          senderRole: auth.roles[0] || null,
          body,
          attachments: req.body?.attachments || undefined,
        },
      });

      await prisma.objectThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      }).catch(() => {});

      return res.status(201).json({ ok: true, message: publicMessage(message) });
    }

    const messages = await prisma.objectThreadMessage.findMany({
      where: { threadId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      thread: threadSummary(thread),
      messages: messages.map(publicMessage),
    });
  } catch (err) {
    console.error('[hub/thread-messages] error', err);
    return res.status(500).json({ error: 'Unable to load thread messages' });
  }
};
