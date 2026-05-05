const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer } = require('./_auth');
const { cleanString } = require('./_http');
const { parseDate, sourceIdFor, writeLedger } = require('./_ledger');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const INTENT_EVENT_TYPES = {
  note: 'hub.note_captured',
  task: 'hub.task_captured',
  event_change: 'hub.schedule_change_requested',
  vendor: 'hub.vendor_captured',
  feedback: 'hub.feedback_submitted',
  checkin: 'hub.checkin_recorded',
  payment: 'hub.payment_captured',
  resource: 'hub.resource_captured',
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const body = req.body || {};
  const rawContent = cleanString(body.rawContent, 6000);
  const captureIntent = cleanString(body.captureIntent, 40) || 'note';
  const source = cleanString(body.source, 80) || 'mobile';
  const sourceId = sourceIdFor({ ...body, source });
  const eventType = INTENT_EVENT_TYPES[captureIntent] || 'hub.capture_created';

  if (!rawContent) return res.status(400).json({ error: 'rawContent is required' });

  try {
    const ledger = await writeLedger(prisma, {
      eventType,
      source,
      sourceId,
      auth,
      occurredAt: body.occurredAt,
      payload: {
        rawContent,
        captureIntent,
        actorRole: body.actorRole || auth.roles[0] || null,
        organizationId: body.organizationId || null,
        spaceId: body.spaceId || null,
        objectId: body.objectId || null,
        objectType: body.objectType || null,
        visibility: body.visibility || null,
        attachments: body.attachments || null,
        clientCreatedAt: body.clientCreatedAt || null,
        offlineQueueId: body.offlineQueueId || null,
      },
    });

    if (prisma.hubCapture?.upsert && sourceId) {
      const capture = await prisma.hubCapture.upsert({
        where: { source_sourceId: { source, sourceId } },
        update: {
          ledgerEventId: ledger.event.id,
          status: 'captured',
          routingSuggestions: {
            ledgerExisting: ledger.existing,
            reviewRequired: !auth.isAdmin,
          },
        },
        create: {
          organizationId: cleanString(body.organizationId, 120),
          spaceId: cleanString(body.spaceId, 120),
          objectId: cleanString(body.objectId, 120),
          objectType: cleanString(body.objectType, 80),
          visibility: cleanString(body.visibility, 40) || (auth.isAdmin ? 'admin' : 'customer'),
          source,
          sourceId,
          actorId: auth.viewer.userId || auth.viewer.supabaseUid,
          actorRole: cleanString(body.actorRole, 40) || auth.roles[0] || null,
          occurredAt: parseDate(body.occurredAt) || new Date(),
          rawContent,
          attachments: body.attachments || undefined,
          clientCreatedAt: parseDate(body.clientCreatedAt),
          offlineQueueId: cleanString(body.offlineQueueId, 160),
          captureIntent,
          ledgerEventId: ledger.event.id,
          routingSuggestions: {
            ledgerExisting: ledger.existing,
            reviewRequired: !auth.isAdmin,
          },
        },
      });

      if (!auth.isAdmin && prisma.brainInboxItem?.create) {
        await prisma.brainInboxItem.create({
          data: {
            rawContent,
            source: 'hub_capture',
            attachments: body.attachments || undefined,
            status: 'pending',
          },
        }).catch(() => {});
      }

      return res.status(201).json({
        ok: true,
        captureId: capture.id,
        ledgerEventId: ledger.event.id,
        existing: ledger.existing,
      });
    }

    return res.status(201).json({
      ok: true,
      captureId: null,
      ledgerEventId: ledger.event.id,
      existing: ledger.existing,
    });
  } catch (err) {
    console.error('[hub/capture] error', err);
    return res.status(500).json({ error: 'Unable to capture hub item' });
  }
};
