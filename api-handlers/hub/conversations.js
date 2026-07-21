const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');


function dmObjectId(a, b) {
  return [a, b].sort().join(':');
}

function threadSummary(thread) {
  const last = thread.messages?.[0] || null;
  return {
    id: thread.id,
    objectType: thread.objectType,
    objectId: thread.objectId,
    title: thread.title,
    visibility: thread.visibility,
    lastMessageAt: asIso(last?.createdAt || thread.updatedAt),
    preview: last?.body || null,
  };
}

function canUseThread(auth, thread) {
  if (!thread) return false;
  if (thread.objectType === 'hub_general') return true;
  if (thread.objectType !== 'hub_dm') return false;
  return String(thread.objectId || '').split(':').includes(auth.viewer.userId);
}

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth);
  if (denied) return res.status(denied.status).json({ error: denied.error });
  if (!auth.viewer.userId) return res.status(403).json({ error: 'Hub profile required' });

  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      const mode = cleanString(body.mode, 40) || 'general';
      const text = cleanString(body.body, 6000);
      const targetUserId = cleanString(body.targetUserId, 120);
      if (!text && body.action !== 'ensure') return res.status(400).json({ error: 'body is required' });

      let thread = null;
      if (mode === 'dm') {
        if (!targetUserId || targetUserId === auth.viewer.userId) return res.status(400).json({ error: 'targetUserId is required' });
        const target = await prisma.hubProfile.findFirst({ where: { userId: targetUserId, status: 'active' } });
        if (!target) return res.status(404).json({ error: 'Person not found' });
        const objectId = dmObjectId(auth.viewer.userId, targetUserId);
        thread = await prisma.objectThread.findFirst({ where: { objectType: 'hub_dm', objectId } });
        if (!thread) {
          const me = auth.hubProfile?.displayName || auth.viewer.email;
          thread = await prisma.objectThread.create({
            data: {
              objectType: 'hub_dm',
              objectId,
              visibility: 'staff',
              title: `${me} / ${target.displayName}`,
              createdBy: auth.viewer.userId,
            },
          });
        }
      } else {
        thread = await prisma.objectThread.findFirst({ where: { objectType: 'hub_general', objectId: 'general' } });
        if (!thread) {
          thread = await prisma.objectThread.create({
            data: {
              objectType: 'hub_general',
              objectId: 'general',
              visibility: 'staff',
              title: 'General',
              createdBy: auth.viewer.userId,
            },
          });
        }
      }

      if (body.action === 'ensure') return res.status(200).json({ ok: true, thread: threadSummary(thread) });

      const message = await prisma.objectThreadMessage.create({
        data: {
          threadId: thread.id,
          senderId: auth.viewer.userId,
          senderRole: auth.viewer.accessLevel || 'staff',
          body: text,
        },
      });
      await prisma.objectThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
      return res.status(201).json({ ok: true, thread: threadSummary({ ...thread, messages: [message] }) });
    }

    const threadId = cleanString(req.query?.threadId, 120);
    if (threadId) {
      const thread = await prisma.objectThread.findUnique({ where: { id: threadId } });
      if (!canUseThread(auth, thread)) return res.status(404).json({ error: 'Conversation not found' });
      const messages = await prisma.objectThreadMessage.findMany({
        where: { threadId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 150,
      });
      return res.status(200).json({
        ok: true,
        thread: threadSummary({ ...thread, messages: messages.slice(-1) }),
        messages: messages.map((message) => ({
          id: message.id,
          senderId: message.senderId,
          senderRole: message.senderRole,
          body: message.body,
          createdAt: asIso(message.createdAt),
        })),
      });
    }

    const general = await prisma.objectThread.findFirst({
      where: { objectType: 'hub_general', objectId: 'general' },
      include: { messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const dms = await prisma.objectThread.findMany({
      where: {
        objectType: 'hub_dm',
        objectId: { contains: auth.viewer.userId },
      },
      include: { messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return res.status(200).json({
      ok: true,
      conversations: [
        general ? threadSummary(general) : { id: null, objectType: 'hub_general', objectId: 'general', title: 'General', visibility: 'staff', preview: null, lastMessageAt: null },
        ...dms.map(threadSummary),
      ],
    });
  } catch (err) {
    console.error('[hub/conversations] error', err);
    return res.status(500).json({ error: 'Unable to manage conversations' });
  }
};
