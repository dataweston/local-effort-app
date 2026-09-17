import { afterEach, describe, expect, it, vi } from 'vitest';
import gmailSyncModule from '../gmailSync';

const {
  decodeGmailPushEnvelope,
  processGmailHistoryNotification,
  renewGmailWatch,
  verifyGmailPubSubRequest,
} = gmailSyncModule;

function historyPrisma(metadata = {}) {
  return {
    brainSyncCursor: {
      upsert: vi.fn().mockResolvedValue({ id: 'history-cursor', metadata }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe('Gmail push watch state', () => {
  it('renews the watch without advancing past unprocessed history', async () => {
    const prisma = historyPrisma({ historyId: '100' });
    const watch = vi.fn().mockResolvedValue({
      data: { historyId: '200', expiration: '1893456000000' },
    });

    const result = await renewGmailWatch({
      topicName: 'projects/example/topics/gmail',
      serviceAccount: 'gmail-push@example.test',
      prismaClient: prisma,
      gmailClient: { users: { watch } },
    });

    expect(watch).toHaveBeenCalledWith({
      userId: 'me',
      requestBody: { topicName: 'projects/example/topics/gmail' },
    });
    const write = prisma.brainSyncCursor.update.mock.calls.at(-1)[0].data.metadata;
    expect(write).toMatchObject({
      mode: 'push',
      historyId: '100',
      watchBaselineHistoryId: '200',
    });
    expect(result).toMatchObject({ configured: true, mode: 'push', historyId: '100' });
  });

  it('lists history from the durable cursor before triggering a recent sync', async () => {
    const prisma = historyPrisma({ historyId: '100', mode: 'push' });
    const list = vi.fn().mockResolvedValue({
      data: {
        historyId: '125',
        history: [
          { messagesAdded: [{ message: { id: 'message-1' } }, { message: { id: 'message-2' } }] },
          { messagesAdded: [{ message: { id: 'message-2' } }] },
        ],
      },
    });
    const syncGmailThreads = vi.fn().mockResolvedValue({
      complete: false,
      processed: 2,
      skipped: 0,
      errors: 0,
    });

    const result = await processGmailHistoryNotification(
      { historyId: '120', messageId: 'push-1' },
      {
        dependencies: {
          prisma,
          getAuthorizedGmailClient: vi.fn().mockResolvedValue({ users: { history: { list } } }),
          syncGmailThreads,
        },
      }
    );

    expect(list).toHaveBeenCalledWith(expect.objectContaining({
      startHistoryId: '100',
      historyTypes: ['messageAdded'],
    }));
    expect(syncGmailThreads).toHaveBeenCalledWith(expect.objectContaining({ refreshRecent: true }));
    expect(result).toMatchObject({ mode: 'push', historyPages: 1, historyChanges: 2, processed: 2 });
    expect(prisma.brainSyncCursor.update.mock.calls.at(-1)[0].data.metadata).toMatchObject({
      historyId: '125',
      lastNotificationMessageId: 'push-1',
      lastHistoryChangeCount: 2,
    });
  });

  it('falls back to the durable recent query when Gmail history has expired', async () => {
    const prisma = historyPrisma({ historyId: '100', mode: 'push' });
    const expired = Object.assign(new Error('Requested entity was not found'), {
      response: { status: 404 },
    });
    const list = vi.fn().mockRejectedValue(expired);
    const syncGmailThreads = vi.fn().mockResolvedValue({
      complete: false,
      processed: 1,
      skipped: 4,
      errors: 0,
    });

    const result = await processGmailHistoryNotification(
      { historyId: '500', messageId: 'push-expired' },
      {
        dependencies: {
          prisma,
          getAuthorizedGmailClient: vi.fn().mockResolvedValue({ users: { history: { list } } }),
          syncGmailThreads,
        },
      }
    );

    expect(result).toMatchObject({ mode: 'polling-fallback', historyExpired: true, processed: 1 });
    expect(prisma.brainSyncCursor.update.mock.calls.at(-1)[0].data.metadata).toMatchObject({
      historyId: '500',
      mode: 'polling-fallback',
    });
  });

  it('returns a retryable error instead of dropping a concurrent notification', async () => {
    const prisma = historyPrisma({ historyId: '100', mode: 'push' });
    prisma.brainSyncCursor.updateMany.mockResolvedValue({ count: 0 });
    const authorize = vi.fn();

    await expect(processGmailHistoryNotification(
      { historyId: '126', messageId: 'push-concurrent' },
      { dependencies: { prisma, getAuthorizedGmailClient: authorize } }
    )).rejects.toMatchObject({ statusCode: 503 });
    expect(authorize).not.toHaveBeenCalled();
  });
});

describe('Gmail Pub/Sub authentication', () => {
  const originalAudience = process.env.GMAIL_PUBSUB_AUDIENCE;
  const originalServiceAccount = process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT;

  afterEach(() => {
    if (originalAudience === undefined) delete process.env.GMAIL_PUBSUB_AUDIENCE;
    else process.env.GMAIL_PUBSUB_AUDIENCE = originalAudience;
    if (originalServiceAccount === undefined) delete process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT;
    else process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT = originalServiceAccount;
  });

  it('verifies the configured audience and service-account identity', async () => {
    process.env.GMAIL_PUBSUB_AUDIENCE = 'https://example.test/api/brain/gmail/push';
    process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT = 'gmail-push@example.test';
    const verifyIdToken = vi.fn().mockResolvedValue({
      aud: process.env.GMAIL_PUBSUB_AUDIENCE,
      iss: 'https://accounts.google.com',
      email: 'gmail-push@example.test',
      email_verified: true,
      sub: '123',
    });

    const identity = await verifyGmailPubSubRequest(
      { headers: { authorization: 'Bearer signed-token' } },
      { verifyIdToken }
    );

    expect(verifyIdToken).toHaveBeenCalledWith('signed-token', process.env.GMAIL_PUBSUB_AUDIENCE);
    expect(identity).toMatchObject({ serviceAccount: 'gmail-push@example.test', subject: '123' });
  });


  it('refuses push mode without an allowlisted service-account identity', async () => {
    process.env.GMAIL_PUBSUB_AUDIENCE = 'https://example.test/api/brain/gmail/push';
    delete process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT;
    const verifyIdToken = vi.fn().mockResolvedValue({
      aud: process.env.GMAIL_PUBSUB_AUDIENCE,
      iss: 'https://accounts.google.com',
      email: 'unrestricted@example.test',
      email_verified: true,
    });

    await expect(verifyGmailPubSubRequest(
      { headers: { authorization: 'Bearer signed-token' } },
      { verifyIdToken }
    )).rejects.toMatchObject({ statusCode: 503 });
  });
  it('keeps Gmail history ids as strings when decoding Pub/Sub data', () => {
    const historyId = '9876543210123456789';
    const data = Buffer.from(JSON.stringify({
      emailAddress: 'owner@example.test',
      historyId,
    })).toString('base64');

    expect(decodeGmailPushEnvelope({ message: { messageId: 'push-1', data } })).toEqual({
      emailAddress: 'owner@example.test',
      historyId,
      messageId: 'push-1',
      publishTime: null,
    });
  });
});
