const crypto = require('crypto');
const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess, coerceHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');


function inviteUrl(req, token) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}/hub?invite=${encodeURIComponent(token)}`;
}

function publicInvite(req, invite) {
  return {
    id: invite.id,
    email: invite.email,
    accessLevel: invite.accessLevel,
    displayNameHint: invite.displayNameHint || '',
    acceptedAt: asIso(invite.acceptedAt),
    expiresAt: asIso(invite.expiresAt),
    createdAt: asIso(invite.createdAt),
    url: invite.acceptedAt ? null : inviteUrl(req, invite.token),
  };
}

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { privileged: true });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    if (req.method === 'GET') {
      const invites = await prisma.hubInvite.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return res.status(200).json({ ok: true, invites: invites.map((invite) => publicInvite(req, invite)) });
    }

    const email = cleanString(req.body?.email, 180)?.toLowerCase();
    const accessLevel = coerceHubAccess(req.body?.accessLevel || 'staff');
    const displayNameHint = cleanString(req.body?.displayNameHint, 120);
    const days = Math.max(1, Math.min(Number(req.body?.daysValid) || 14, 90));
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email is required' });

    const invite = await prisma.hubInvite.create({
      data: {
        token: crypto.randomBytes(32).toString('base64url'),
        email,
        accessLevel,
        displayNameHint,
        invitedByUserId: auth.viewer.userId || null,
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });

    return res.status(201).json({ ok: true, invite: publicInvite(req, invite) });
  } catch (err) {
    console.error('[hub/invites] error', err);
    return res.status(500).json({ error: 'Unable to manage invites' });
  }
};
