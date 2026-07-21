const { prisma } = require('../_lib/prisma');
const { resolveHubViewer } = require('./_auth');
const { methodNotAllowed, asIso, cleanString, safePrisma } = require('./_http');


function allowedVisibility(auth) {
  if (auth.isPrivileged || auth.isAdmin) return ['customer', 'household', 'staff', 'privileged', 'vendor', 'volunteer', 'guest', 'admin'];
  if (auth.hasHubAccess) return ['staff'];
  if (auth.customer) return ['customer', 'household', 'guest'];
  return ['guest'];
}

function canReadThread(auth, thread) {
  if (!thread) return false;
  if (thread.objectType === 'hub_dm') {
    const participants = String(thread.objectId || '').split(':').filter(Boolean);
    return !!auth.viewer.userId && participants.includes(auth.viewer.userId);
  }
  if (thread.visibility === 'privileged') return !!auth.isPrivileged;
  return allowedVisibility(auth).includes(thread.visibility);
}

function threadSummary(thread) {
  const last = thread.messages?.[0] || null;
  return {
    id: thread.id,
    objectType: thread.objectType,
    objectId: thread.objectId,
    title: thread.title,
    visibility: thread.visibility,
    unreadCount: 0,
    lastMessageAt: asIso(last?.createdAt || thread.updatedAt),
    preview: last?.body || null,
  };
}

async function objectThreads(auth, { objectType, objectId }) {
  const where = {
    visibility: { in: allowedVisibility(auth) },
    ...(objectType ? { objectType } : {}),
    ...(objectId ? { objectId } : {}),
  };

  return safePrisma([], () => prisma.objectThread.findMany({
    where,
    include: {
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  }));
}

async function legacyChefThreads(auth, { objectType, objectId }) {
  if (!auth.customer) return [];
  if (objectType && objectType !== 'menu_week') return [];

  const notes = await prisma.chefNote.findMany({
    where: { customerId: auth.customer.id },
    orderBy: { createdAt: 'desc' },
    take: objectId ? 1 : 10,
  });

  return notes.map((note) => ({
    id: `legacy-chef-note:${note.id}`,
    objectType: 'menu_week',
    objectId: objectId || 'legacy',
    title: 'Chef note',
    visibility: 'customer',
    unreadCount: 0,
    lastMessageAt: asIso(note.createdAt),
    preview: note.message,
  }));
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const objectType = cleanString(req.query?.objectType, 80);
  const objectId = cleanString(req.query?.objectId, 120);

  try {
    const [threads, legacy] = await Promise.all([
      objectThreads(auth, { objectType, objectId }),
      legacyChefThreads(auth, { objectType, objectId }),
    ]);

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      threads: [...threads.map(threadSummary), ...legacy],
    });
  } catch (err) {
    console.error('[hub/threads] error', err);
    return res.status(500).json({ error: 'Unable to load hub threads' });
  }
};

module.exports.allowedVisibility = allowedVisibility;
module.exports.threadSummary = threadSummary;
module.exports.canReadThread = canReadThread;
