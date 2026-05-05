/*
 * One-time backfill: mirror legacy ChefNote rows into ObjectThread messages.
 *
 * Dry run: pnpm hub:backfill-chef-notes:dry
 * Apply:   pnpm hub:backfill-chef-notes
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function ensureThread(note) {
  const objectType = 'customer_profile';
  const objectId = note.customerId;
  const existing = await prisma.objectThread.findFirst({
    where: {
      objectType,
      objectId,
      visibility: 'customer',
      title: 'Chef notes',
    },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return { thread: existing, created: false };

  if (!apply) {
    return {
      thread: {
        id: `dry-thread:${objectType}:${objectId}`,
        objectType,
        objectId,
        visibility: 'customer',
        title: 'Chef notes',
        createdBy: note.userId,
      },
      created: true,
    };
  }

  const thread = await prisma.objectThread.create({
    data: {
      objectType,
      objectId,
      visibility: 'customer',
      title: 'Chef notes',
      createdBy: note.userId,
      createdAt: note.createdAt,
      updatedAt: note.createdAt,
    },
  });
  return { thread, created: true };
}

async function messageExists(threadId, note) {
  if (!apply || threadId.startsWith('dry-thread:')) return false;
  const existing = await prisma.objectThreadMessage.findFirst({
    where: {
      threadId,
      senderId: note.userId,
      body: note.message,
      createdAt: note.createdAt,
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function main() {
  const notes = await prisma.chefNote.findMany({
    orderBy: { createdAt: 'asc' },
  });

  let threadsCreated = 0;
  let messagesCreated = 0;
  let messagesSkipped = 0;

  for (const note of notes) {
    const { thread, created } = await ensureThread(note);
    if (created) threadsCreated += 1;

    if (await messageExists(thread.id, note)) {
      messagesSkipped += 1;
      continue;
    }

    if (apply) {
      await prisma.objectThreadMessage.create({
        data: {
          threadId: thread.id,
          senderId: note.userId,
          senderRole: 'staff',
          body: note.message,
          createdAt: note.createdAt,
        },
      });
      await prisma.objectThread.update({
        where: { id: thread.id },
        data: { updatedAt: note.createdAt },
      });
    }

    messagesCreated += 1;
  }

  console.info('[backfill-hub-chef-notes] complete', {
    mode: apply ? 'apply' : 'dry-run',
    notes: notes.length,
    threadsCreated,
    messagesCreated,
    messagesSkipped,
  });
}

main()
  .catch((error) => {
    console.error('[backfill-hub-chef-notes] failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
