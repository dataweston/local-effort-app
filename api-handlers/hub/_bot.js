const { PrismaClient } = require('@prisma/client');

async function findOrCreateThread(prisma, { objectType, objectId, visibility, title }) {
  const existing = await prisma.objectThread.findFirst({
    where: { objectType, objectId, visibility },
  });
  if (existing) return existing;
  return prisma.objectThread.create({
    data: { objectType, objectId, visibility, title: title || objectType },
  });
}

async function postBotMessage(prisma, { objectType, objectId, visibility, title, body }) {
  const thread = await findOrCreateThread(prisma, { objectType, objectId, visibility, title });
  const message = await prisma.objectThreadMessage.create({
    data: { threadId: thread.id, senderId: 'system', senderRole: 'bot', body },
  });
  await prisma.objectThread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  }).catch(() => {});
  return { thread, message };
}

async function postUserMessage(prisma, { objectType, objectId, visibility, title, body, senderId, senderRole }) {
  const thread = await findOrCreateThread(prisma, { objectType, objectId, visibility, title });
  const message = await prisma.objectThreadMessage.create({
    data: { threadId: thread.id, senderId, senderRole, body },
  });
  await prisma.objectThread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  }).catch(() => {});
  return { thread, message };
}

module.exports = { findOrCreateThread, postBotMessage, postUserMessage };
