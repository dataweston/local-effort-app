const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso } = require('./_http');


function publicPerson(profile) {
  return {
    id: profile.id,
    userId: profile.userId,
    email: profile.email,
    displayName: profile.displayName,
    accessLevel: profile.accessLevel,
    title: profile.title || null,
    status: profile.status,
    lastSeenAt: asIso(profile.lastSeenAt),
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    const people = await prisma.hubProfile.findMany({
      where: { status: 'active' },
      orderBy: [{ displayName: 'asc' }],
      take: 200,
    });
    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      people: people.map(publicPerson),
    });
  } catch (err) {
    console.error('[hub/people] error', err);
    return res.status(500).json({ error: 'Unable to load hub people' });
  }
};
