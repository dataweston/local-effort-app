const { prisma } = require('../_lib/prisma');
const {
  verifySupabaseToken,
  findUserByEmail,
  isAdminEmail,
  isReadOnlyAdminEmail,
} = require('../weekly-order/_auth');
const { methodNotAllowed, asIso, cleanString, safePrisma } = require('./_http');
const { coerceHubAccess } = require('./_auth');


function publicProfile(profile, user) {
  if (!profile) return null;
  return {
    id: profile.id,
    userId: profile.userId,
    email: profile.email,
    displayName: profile.displayName,
    accessLevel: profile.accessLevel,
    title: profile.title || null,
    phone: profile.phone || null,
    status: profile.status,
    isPrivileged: profile.accessLevel === 'privileged' || isAdminEmail(user?.email || profile.email),
    isCustomer: profile.accessLevel === 'customer',
    createdAt: asIso(profile.createdAt),
    updatedAt: asIso(profile.updatedAt),
  };
}

function publicInvite(invite) {
  if (!invite) return null;
  return {
    email: invite.email,
    accessLevel: coerceHubAccess(invite.accessLevel),
    displayNameHint: invite.displayNameHint || '',
    accepted: !!invite.acceptedAt,
    expired: invite.expiresAt ? new Date(invite.expiresAt) < new Date() : false,
    expiresAt: asIso(invite.expiresAt),
  };
}

async function findInvite(token) {
  const cleanToken = cleanString(token, 240);
  if (!cleanToken) return null;
  return safePrisma(null, () => prisma.hubInvite.findUnique({ where: { token: cleanToken } }));
}

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  if (req.method === 'GET' && req.query?.invite) {
    const invite = await findInvite(req.query.invite);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    return res.status(200).json({ ok: true, invite: publicInvite(invite) });
  }

  const supabaseUser = await verifySupabaseToken(req);
  if (!supabaseUser?.email) return res.status(401).json({ error: 'Unauthorized' });
  if (isReadOnlyAdminEmail(supabaseUser.email) && req.method !== 'GET') {
    return res.status(403).json({ error: 'Read-only admin access' });
  }

  try {
    if (req.method === 'GET') {
      const user = await findUserByEmail(prisma, supabaseUser.email, { hubProfile: true });
      return res.status(200).json({
        ok: true,
        user: user ? { id: user.id, email: user.email, role: user.role } : null,
        profile: publicProfile(user?.hubProfile || null, user),
      });
    }

    const inviteToken = cleanString(req.body?.inviteToken, 240);
    const displayName = cleanString(req.body?.displayName, 120);
    const title = cleanString(req.body?.title, 120);
    const phone = cleanString(req.body?.phone, 80);
    const invite = inviteToken ? await findInvite(inviteToken) : null;
    const normalizedEmail = String(supabaseUser.email).trim().toLowerCase();

    if (!invite && !isAdminEmail(normalizedEmail)) {
      return res.status(403).json({ error: 'A valid invite is required' });
    }
    if (invite?.acceptedAt) return res.status(409).json({ error: 'Invite already accepted' });
    if (invite?.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Invite expired' });
    }
    if (invite && String(invite.email).trim().toLowerCase() !== normalizedEmail) {
      return res.status(403).json({ error: 'Invite email does not match this account' });
    }

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: {
        email: normalizedEmail,
        role: isAdminEmail(normalizedEmail) ? 'admin' : 'member',
      },
    });
    const accessLevel = coerceHubAccess(invite?.accessLevel || (isAdminEmail(normalizedEmail) ? 'privileged' : 'staff'));
    const profile = await prisma.hubProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: displayName || invite?.displayNameHint || user.email,
        accessLevel,
        title,
        phone,
        status: 'active',
        lastSeenAt: new Date(),
      },
      create: {
        userId: user.id,
        email: normalizedEmail,
        displayName: displayName || invite?.displayNameHint || user.email,
        accessLevel,
        title,
        phone,
        status: 'active',
        lastSeenAt: new Date(),
      },
    });

    if (invite) {
      await prisma.hubInvite.update({
        where: { id: invite.id },
        data: { acceptedByUserId: user.id, acceptedAt: new Date() },
      });
    }

    return res.status(200).json({ ok: true, user: { id: user.id, email: user.email, role: user.role }, profile: publicProfile(profile, user) });
  } catch (err) {
    console.error('[hub/profile] error', err);
    return res.status(500).json({ error: 'Unable to save hub profile' });
  }
};
