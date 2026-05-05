const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer } = require('./_auth');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

function cleanString(value, max = 500) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const body = req.body || {};
  const pushToken = cleanString(body.pushToken, 600);
  const platform = cleanString(body.platform, 40);

  if (!pushToken || !platform) {
    return res.status(400).json({ error: 'pushToken and platform are required' });
  }

  if (!prisma.mobilePushToken?.upsert) {
    return res.status(503).json({ error: 'Mobile push token model unavailable' });
  }

  try {
    const token = await prisma.mobilePushToken.upsert({
      where: { pushToken },
      update: {
        userId: auth.viewer.userId,
        supabaseUid: auth.viewer.supabaseUid,
        platform,
        deviceId: cleanString(body.deviceId, 160),
        permissionsStatus: cleanString(body.permissionsStatus, 80),
        lastSeenAt: new Date(),
      },
      create: {
        userId: auth.viewer.userId,
        supabaseUid: auth.viewer.supabaseUid,
        platform,
        pushToken,
        deviceId: cleanString(body.deviceId, 160),
        permissionsStatus: cleanString(body.permissionsStatus, 80),
        lastSeenAt: new Date(),
      },
    });

    return res.status(200).json({ ok: true, id: token.id });
  } catch (err) {
    console.error('[hub/push-register] error', err);
    return res.status(500).json({ error: 'Unable to register push token' });
  }
};
