const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer } = require('./_auth');
const { methodNotAllowed, cleanString, safePrisma } = require('./_http');
const { parseDate, sourceIdFor, writeLedger } = require('./_ledger');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const body = req.body || {};
  const objectType = cleanString(body.objectType, 80);
  const objectId = cleanString(body.objectId, 160);
  const status = cleanString(body.status, 40) || 'checked_in';
  const note = cleanString(body.note || body.rawContent, 3000);

  if (!objectType) return res.status(400).json({ error: 'objectType is required' });
  if (!objectId) return res.status(400).json({ error: 'objectId is required' });

  try {
    const source = cleanString(body.source, 80) || 'mobile';
    const sourceId = sourceIdFor({ ...body, source }, ['checkin', objectType, objectId, auth.viewer.userId || auth.viewer.supabaseUid]);
    const occurredAt = body.occurredAt || new Date().toISOString();
    const ledger = await writeLedger(prisma, {
      eventType: 'hub.checkin_recorded',
      source,
      sourceId,
      auth,
      occurredAt,
      payload: {
        captureIntent: 'checkin',
        actorRole: body.actorRole || auth.roles[0] || null,
        objectType,
        objectId,
        status,
        note,
        spaceId: body.spaceId || null,
        customerId: auth.customer?.id || null,
        attachments: body.attachments || null,
      },
    });

    const capture = await safePrisma(null, () => {
      if (!prisma.hubCapture?.upsert || !sourceId) return Promise.resolve(null);
      return prisma.hubCapture.upsert({
        where: { source_sourceId: { source, sourceId } },
        update: {
          ledgerEventId: ledger.event.id,
          status: 'captured',
          routingSuggestions: { ledgerExisting: ledger.existing },
        },
        create: {
          spaceId: cleanString(body.spaceId, 120),
          objectId,
          objectType,
          visibility: cleanString(body.visibility, 40) || (auth.isAdmin ? 'admin' : 'customer'),
          source,
          sourceId,
          actorId: auth.viewer.userId || auth.viewer.supabaseUid,
          actorRole: cleanString(body.actorRole, 40) || auth.roles[0] || null,
          occurredAt: parseDate(occurredAt) || new Date(),
          rawContent: note || `${status} ${objectType}:${objectId}`,
          attachments: body.attachments || undefined,
          clientCreatedAt: parseDate(body.clientCreatedAt),
          offlineQueueId: cleanString(body.offlineQueueId, 160),
          captureIntent: 'checkin',
          ledgerEventId: ledger.event.id,
          routingSuggestions: { ledgerExisting: ledger.existing },
        },
      });
    });

    return res.status(201).json({
      ok: true,
      checkinId: capture?.id || null,
      ledgerEventId: ledger.event.id,
      existing: ledger.existing,
    });
  } catch (err) {
    console.error('[hub/checkins] error', err);
    return res.status(500).json({ error: 'Unable to record hub check-in' });
  }
};
