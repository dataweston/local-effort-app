import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createChefMembershipHandlers } = require('../../api-handlers/hub/_chefMembership');
const { hubAccessFor } = require('../../api-handlers/hub/_auth');
const owner = { id: 'owner-uid', email: 'chef-owner@example.test' };
const terms = {
  _rev: 'approved-revision', title: 'Final membership agreement', version: 'approved-1',
  agreementText: 'Complete independently approved membership agreement. '.repeat(4),
  acceptanceText: 'I accept the complete agreement.', onboardingInstructions: 'Complete secure onboarding with the owner.',
  approvalReference: 'Approved agreement record', replyEmail: 'reply@example.test',
};

async function adopt(flags) {
  const policies = [];
  const db = {
    chefMembership: {}, chefMembershipEvent: {},
    chefMembershipPolicy: { async upsert({ create }) {
      const policy = { id: 'policy', ...create };
      policies.push(policy);
      return policy;
    } },
  };
  const { admin } = createChefMembershipHandlers({
    prismaClient: db, rateLimit: async () => true,
    resolveReviewer: async () => ({ ...hubAccessFor({ isAdmin: true }), supabaseUser: owner, isReadOnlyAdmin: false }),
    loadPolicy: async () => ({ ...terms, ...flags }),
  });
  const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await admin({ method: 'POST', headers: {}, query: {}, body: { action: 'adopt-policy', expectedCmsRevision: terms._rev, confirmed: true } }, res);
  return { res, policies };
}

beforeEach(() => vi.stubEnv('ADMIN_EMAILS', owner.email));
afterEach(() => vi.unstubAllEnvs());

describe('membership policy feature authorization', () => {
  it.each([undefined, null])('adopts complete terms with unset flags (%s) without enabling work or publication', async value => {
    const { res, policies } = await adopt({ operationsEnabled: value, publicationEnabled: value });
    expect(res.statusCode).toBe(200);
    expect(policies[0].snapshot).toMatchObject({ operationsEnabled: false, publicationEnabled: false });
    expect(policies[0].snapshot).not.toHaveProperty('publicationConsentText');
  });

  it.each([true, false])('preserves explicit boolean authorization (%s)', async value => {
    const { res, policies } = await adopt({ operationsEnabled: value, publicationEnabled: value, publicationConsentText: 'I authorize publication of these exact details.' });
    expect(res.statusCode).toBe(200);
    expect(policies[0].snapshot).toMatchObject({ operationsEnabled: value, publicationEnabled: value });
  });

  it.each(['true', 1])('rejects non-boolean feature authorization (%s) without adopting it', async value => {
    for (const field of ['operationsEnabled', 'publicationEnabled']) {
      const { res, policies } = await adopt({ [field]: value });
      expect(res.statusCode).toBe(409);
      expect(policies).toEqual([]);
    }
  });

  it('requires an exact consent statement before publication can be adopted', async () => {
    const missing = await adopt({ publicationEnabled: true });
    expect(missing.res.statusCode).toBe(400);
    expect(missing.policies).toEqual([]);
    const complete = await adopt({ publicationEnabled: true, publicationConsentText: 'I authorize these reviewed details to be published.' });
    expect(complete.res.statusCode).toBe(200);
    expect(complete.policies[0].snapshot).toMatchObject({ operationsEnabled: false, publicationEnabled: true, publicationConsentText: 'I authorize these reviewed details to be published.' });
  });
});
