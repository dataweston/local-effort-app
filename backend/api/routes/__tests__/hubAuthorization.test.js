import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const auth = require('../../../../api-handlers/hub/_auth');
const { allowedVisibility } = require('../../../../api-handlers/hub/threads');
const { fallbackSpaces, canViewSpace } = require('../../../../api-handlers/hub/spaces');
const { objectThreadWhere } = require('../../../../api-handlers/hub/today');

const originalAdminEmails = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = originalAdminEmails;
});

describe('Hub access policy', () => {
  it('treats localist as a first-class non-staff access level', () => {
    const access = auth.hubAccessFor({
      hubProfile: { status: 'active', accessLevel: 'localist' },
      isAdmin: false,
    });

    expect(auth.coerceHubAccess('localist')).toBe('localist');
    expect(access).toMatchObject({
      accessLevel: 'localist',
      hasHubAccess: true,
      isLocalist: true,
      isCustomer: false,
      isStaff: false,
      isPrivileged: false,
    });
    expect(auth.requireHubAccess(access)).toMatchObject({ status: 403 });
    expect(auth.requireHubAccess(access, {
      allowedAccess: ['localist', 'customer', 'staff', 'privileged'],
    })).toBeNull();
  });

  it('denies unknown access values instead of coercing them to staff', () => {
    const access = auth.hubAccessFor({
      hubProfile: { status: 'active', accessLevel: 'operator' },
      isAdmin: false,
    });

    expect(auth.coerceHubAccess('operator')).toBeNull();
    expect(access).toMatchObject({ accessLevel: null, hasHubAccess: false, isStaff: false });
    expect(auth.requireHubAccess(access)).toMatchObject({ status: 403 });
  });

  it('denies an inactive profile even for an explicitly configured admin', () => {
    const access = auth.hubAccessFor({
      hubProfile: { status: 'inactive', accessLevel: 'privileged' },
      isAdmin: true,
    });

    expect(access).toMatchObject({ accessLevel: null, hasHubAccess: false, isPrivileged: false });
    expect(auth.requireHubAccess(access)).toMatchObject({ status: 403 });
    expect(auth.hubAccessFor({ hubProfile: null, isAdmin: true })).toMatchObject({
      accessLevel: 'privileged',
      hasHubAccess: true,
      isStaff: true,
      isPrivileged: true,
    });
  });

  it('does not elevate every Local Effort domain address', () => {
    process.env.ADMIN_EMAILS = 'configured-admin@example.com';

    expect(auth.isExplicitHubAdminEmail('configured-admin@example.com')).toBe(true);
    expect(auth.isExplicitHubAdminEmail('unconfigured@localeffortfood.com')).toBe(false);
  });

  it('keeps customer and Localist viewers out of staff thread visibility', () => {
    expect(allowedVisibility({ isPrivileged: false, isStaff: false })).toEqual([]);
    expect(allowedVisibility({ isPrivileged: false, isStaff: true })).toEqual(['staff']);
    expect(allowedVisibility({ isPrivileged: true, isStaff: true })).toContain('staff');
  });

  it('never returns staff spaces to member access levels', () => {
    const customer = {
      isPrivileged: false,
      isStaff: false,
      customer: { id: 'customer-1', name: 'Household' },
      roles: ['member', 'customer', 'subscriber'],
      viewer: { accessLevel: 'customer' },
    };
    const localist = {
      isPrivileged: false,
      isStaff: false,
      customer: null,
      roles: ['member', 'localist'],
      viewer: { accessLevel: 'localist' },
    };

    expect(fallbackSpaces(customer).map((space) => space.visibility)).toEqual(['household']);
    expect(fallbackSpaces(localist)).toEqual([]);
    expect(canViewSpace(customer, 'staff')).toBe(false);
    expect(canViewSpace(customer, 'household')).toBe(true);
  });

  it('scopes Today customer threads to the viewer household instead of shared menu ids', () => {
    const where = objectThreadWhere({
      isStaff: false,
      isPrivileged: false,
      customer: { id: 'customer-1' },
    }, ['shared-menu-week']);

    expect(where).toEqual({
      OR: [
        { objectType: 'customer', objectId: 'customer-1' },
        { objectType: 'household', objectId: 'customer-1' },
      ],
      visibility: { in: ['customer', 'household'] },
    });
    expect(JSON.stringify(where)).not.toContain('shared-menu-week');
  });

  it('preserves staff and privileged endpoint access', () => {
    const staff = auth.hubAccessFor({
      hubProfile: { status: 'active', accessLevel: 'staff' },
      isAdmin: false,
    });
    const privileged = auth.hubAccessFor({
      hubProfile: { status: 'active', accessLevel: 'privileged' },
      isAdmin: false,
    });

    expect(auth.requireHubAccess(staff)).toBeNull();
    expect(auth.requireHubAccess(privileged)).toBeNull();
    expect(auth.requireHubAccess(privileged, { privileged: true })).toBeNull();
  });
});

describe('Hub profile lifecycle', () => {
  it('does not let a valid invite reactivate an inactive profile', async () => {
    const weeklyAuthPath = require.resolve('../../../../api-handlers/weekly-order/_auth');
    const prismaPath = require.resolve('../../../../api-handlers/_lib/prisma');
    const profilePath = require.resolve('../../../../api-handlers/hub/profile');
    const savedWeeklyAuth = require.cache[weeklyAuthPath];
    const savedPrisma = require.cache[prismaPath];
    const upsertUser = vi.fn();
    const upsertProfile = vi.fn();
    const prisma = {
      hubInvite: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'invite-1',
          token: 'valid-token',
          email: 'member@example.com',
          accessLevel: 'localist',
          acceptedAt: null,
          expiresAt: new Date('2099-01-01'),
        }),
      },
      user: { upsert: upsertUser },
      hubProfile: { upsert: upsertProfile },
    };

    require.cache[weeklyAuthPath] = {
      id: weeklyAuthPath,
      filename: weeklyAuthPath,
      loaded: true,
      exports: {
        verifySupabaseToken: vi.fn().mockResolvedValue({ id: 'supabase-1', email: 'member@example.com' }),
        findUserByEmail: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'member@example.com',
          hubProfile: { id: 'profile-1', status: 'inactive', accessLevel: 'localist' },
        }),
        isReadOnlyAdminEmail: vi.fn().mockReturnValue(false),
      },
    };
    require.cache[prismaPath] = {
      id: prismaPath,
      filename: prismaPath,
      loaded: true,
      exports: { prisma },
    };
    delete require.cache[profilePath];

    try {
      const profile = require('../../../../api-handlers/hub/profile');
      const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
      };

      await profile({
        method: 'POST',
        query: {},
        body: { inviteToken: 'valid-token', displayName: 'Member' },
        headers: {},
      }, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatch(/inactive/i);
      expect(upsertUser).not.toHaveBeenCalled();
      expect(upsertProfile).not.toHaveBeenCalled();
    } finally {
      delete require.cache[profilePath];
      if (savedWeeklyAuth) require.cache[weeklyAuthPath] = savedWeeklyAuth;
      else delete require.cache[weeklyAuthPath];
      if (savedPrisma) require.cache[prismaPath] = savedPrisma;
      else delete require.cache[prismaPath];
    }
  });
});

describe('capture endpoint authorization', () => {
  it('rejects an authenticated viewer without an entitled Hub profile before writing', async () => {
    const authPath = require.resolve('../../../../api-handlers/hub/_auth');
    const prismaPath = require.resolve('../../../../api-handlers/_lib/prisma');
    const capturePath = require.resolve('../../../../api-handlers/hub/capture');
    const savedAuth = require.cache[authPath];
    const savedPrisma = require.cache[prismaPath];

    require.cache[authPath] = {
      id: authPath,
      filename: authPath,
      loaded: true,
      exports: {
        resolveHubViewer: vi.fn().mockResolvedValue({
          supabaseUser: { id: 'authenticated-user', email: 'viewer@example.com' },
          hasHubAccess: false,
          accessLevel: null,
        }),
        requireHubAccess: auth.requireHubAccess,
      },
    };
    require.cache[prismaPath] = {
      id: prismaPath,
      filename: prismaPath,
      loaded: true,
      exports: { prisma: {} },
    };
    delete require.cache[capturePath];

    try {
      const capture = require('../../../../api-handlers/hub/capture');
      const req = {
        method: 'POST',
        body: { rawContent: 'must not be written' },
        query: {},
        headers: {},
      };
      const res = {
        statusCode: null,
        body: null,
        setHeader: vi.fn(),
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };

      await capture(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ error: 'Hub access required' });
    } finally {
      delete require.cache[capturePath];
      if (savedAuth) require.cache[authPath] = savedAuth;
      else delete require.cache[authPath];
      if (savedPrisma) require.cache[prismaPath] = savedPrisma;
      else delete require.cache[prismaPath];
    }
  });
});
