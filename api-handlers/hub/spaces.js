const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer } = require('./_auth');
const { methodNotAllowed, safePrisma } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

function fallbackSpaces(auth) {
  const spaces = [];
  if (auth.customer) {
    spaces.push({
      id: `customer:${auth.customer.id}`,
      title: auth.customer.name || auth.customer.slug,
      role: auth.roles.includes('subscriber') ? 'subscriber' : 'member',
      visibility: 'household',
      unreadCount: 0,
      objectCount: 1,
    });
  }
  if (auth.isAdmin) {
    spaces.push({
      id: 'admin:operations',
      title: 'Operations',
      role: 'admin',
      visibility: 'admin',
      unreadCount: 0,
      objectCount: 0,
    });
  }
  return spaces;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const membershipFilters = [
      auth.viewer.userId ? { userId: auth.viewer.userId } : null,
      auth.viewer.customerId ? { customerId: auth.viewer.customerId } : null,
    ].filter(Boolean);
    const memberships = await safePrisma([], () => prisma.hubSpaceMembership.findMany({
      where: membershipFilters.length ? { OR: membershipFilters } : { id: '__none__' },
      include: {
        space: true,
      },
      orderBy: { createdAt: 'asc' },
    }));

    const dbSpaces = memberships.map((membership) => ({
      id: membership.spaceId,
      title: membership.space?.title || membership.spaceId,
      role: membership.role,
      visibility: membership.visibility || membership.space?.visibility || 'customer',
      unreadCount: 0,
      objectCount: 0,
    }));

    const byId = new Map();
    [...fallbackSpaces(auth), ...dbSpaces].forEach((space) => byId.set(space.id, space));

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      spaces: [...byId.values()],
    });
  } catch (err) {
    console.error('[hub/spaces] error', err);
    return res.status(500).json({ error: 'Unable to load hub spaces' });
  }
};
