import { beforeEach, describe, expect, it, vi } from 'vitest';

// Regression cover for the failure that silently disconnected Gmail for four
// months: tokens were keyed by a hash of their own payload, so every refresh
// minted a new row instead of updating one, and refresh responses (which omit
// refresh_token) were dropped entirely.
//
// backend/ is loaded as CommonJS and escapes vi.mock, so this injects through
// the globalThis seam in backend/api/utils/prisma.js instead. The DATABASE_URL
// vars are cleared first as a fail-safe: if the injection ever stops working,
// createPrismaClient() returns null and these tests crash rather than writing
// to the live BrainApiToken table.
for (const key of [
  'DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING',
  'VERCEL_POSTGRES_URL', 'VERCEL_POSTGRES_URL_NON_POOLING',
  'POSTGRES_PRISMA_URL', 'POSTGRES_URL_NO_SSL',
]) delete process.env[key];

const store = { rows: [] };

const prismaMock = {
  brainApiToken: {
    findUnique: vi.fn(async ({ where }) => store.rows.find((r) => r.tokenHash === where.tokenHash) || null),
    findFirst: vi.fn(async ({ where }) => {
      let rows = store.rows.filter((r) => r.label === where.label);
      if (where.NOT?.tokenData) rows = rows.filter((r) => r.tokenData != null);
      return rows[rows.length - 1] || null;
    }),
    upsert: vi.fn(async ({ where, update, create }) => {
      const existing = store.rows.find((r) => r.tokenHash === where.tokenHash);
      if (existing) Object.assign(existing, update);
      else store.rows.push({ ...create });
    }),
  },
};

globalThis.__localEffortPrisma = prismaMock;

const { storeGmailTokens, loadGmailTokens } = await import('../gmailSync.js');

describe('Gmail token persistence', () => {
  beforeEach(() => {
    store.rows.length = 0;
  });

  it('injects the mock rather than touching a real database', async () => {
    const { getPrisma } = await import('../../utils/prisma.js');
    expect(getPrisma()).toBe(prismaMock);
  });

  it('reuses one row across repeated writes instead of accumulating orphans', async () => {
    await storeGmailTokens({ access_token: 'a1', refresh_token: 'r1', expiry_date: 1 });
    await storeGmailTokens({ access_token: 'a2', expiry_date: 2 });
    await storeGmailTokens({ access_token: 'a3', expiry_date: 3 });

    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].tokenData.access_token).toBe('a3');
  });

  it('keeps the refresh_token when a refresh response omits it', async () => {
    await storeGmailTokens({ access_token: 'a1', refresh_token: 'r1' });
    // Google returns refresh_token only on the first consent.
    await storeGmailTokens({ access_token: 'a2', expiry_date: 999 });

    const loaded = await loadGmailTokens();
    expect(loaded.refresh_token).toBe('r1');
    expect(loaded.access_token).toBe('a2');
  });

  it('falls back to a legacy row that still holds token data', async () => {
    store.rows.push({
      label: 'gmail-sync',
      tokenHash: 'legacy-hash-from-payload-keying',
      tokenData: { access_token: 'legacy', refresh_token: 'legacy-r' },
    });

    const loaded = await loadGmailTokens();
    expect(loaded.refresh_token).toBe('legacy-r');
  });

  it('normalizes the python google-auth token shape', async () => {
    store.rows.push({
      label: 'gmail-sync',
      tokenHash: 'python-written',
      tokenData: { token: 'py-access', refresh_token: 'py-r', scopes: ['a', 'b'] },
    });

    const loaded = await loadGmailTokens();
    expect(loaded.access_token).toBe('py-access');
    expect(loaded.scope).toBe('a b');
  });
});
