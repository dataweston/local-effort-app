const { PrismaClient } = require('@prisma/client');
const { methodNotAllowed, asIso, cleanString, tableMissing } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const THREAD_TYPE = 'hub_localist';
const THREAD_ID = 'public-localist';
const IMAGE_HOST_HINTS = ['giphy.com', 'tenor.com', 'media.tenor.com'];

async function getLocalistThread() {
  let thread = await prisma.objectThread.findFirst({
    where: { objectType: THREAD_TYPE, objectId: THREAD_ID },
  });
  if (!thread) {
    thread = await prisma.objectThread.create({
      data: {
        objectType: THREAD_TYPE,
        objectId: THREAD_ID,
        visibility: 'public',
        title: 'Localist Chat',
      },
    });
  }
  return thread;
}

function publicMessage(message) {
  return {
    id: message.id,
    senderName: message.senderRole || 'Guest',
    body: message.body || '',
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    createdAt: asIso(message.createdAt),
  };
}

function normalizeImageUrl(value) {
  const raw = cleanString(value, 1000);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const lower = parsed.href.toLowerCase();
    const looksLikeImage = /\.(gif|png|jpe?g|webp)(\?|#|$)/.test(lower);
    const knownImageHost = IMAGE_HOST_HINTS.some((host) => parsed.hostname.toLowerCase().includes(host));
    return looksLikeImage || knownImageHost ? parsed.href : null;
  } catch (_err) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  res.setHeader('Cache-Control', 'no-store');

  try {
    const thread = await getLocalistThread();

    if (req.method === 'POST') {
      const senderName = cleanString(req.body?.senderName, 60);
      const body = cleanString(req.body?.body, 1000) || '';
      const imageUrl = normalizeImageUrl(req.body?.imageUrl);

      if (!senderName) return res.status(400).json({ error: 'Name is required' });
      if (!body && !imageUrl) return res.status(400).json({ error: 'Message or image/GIF URL is required' });

      const attachments = imageUrl ? [{ type: 'image', url: imageUrl }] : undefined;
      const message = await prisma.objectThreadMessage.create({
        data: {
          threadId: thread.id,
          senderRole: senderName,
          body,
          attachments,
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
      orderBy: { createdAt: 'asc' },
      take: 150,
    });

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      messages: messages.map(publicMessage),
    });
  } catch (err) {
    console.error('[hub/localist-chat] error', err);
    if (tableMissing(err)) {
      return res.status(503).json({ error: 'Localist chat storage is not ready. Run Prisma migrations.' });
    }
    return res.status(500).json({ error: 'Unable to load Localist chat' });
  }
};
