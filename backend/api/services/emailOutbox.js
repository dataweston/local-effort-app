const crypto = require('crypto');

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizeForId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function stableOutboxId(idempotencyKey) {
  const raw = String(idempotencyKey || '').trim();
  if (!raw) return null;
  const hash = crypto.createHash('sha1').update(raw).digest('hex');
  return `email-outbox-${hash}`;
}

function toIsoNow() {
  return new Date().toISOString();
}

function nextAttemptIso(attempt) {
  const minuteMs = 60 * 1000;
  const backoffMinutes = Math.min(5 * (2 ** Math.max(0, attempt - 1)), 24 * 60);
  return new Date(Date.now() + backoffMinutes * minuteMs).toISOString();
}

function extractRecipients(payload) {
  const to = safeArray(payload?.to);
  return to
    .map((entry) => normalizeEmail(entry?.email))
    .filter(Boolean);
}

function createEmailOutboxService({ getSanityClient, getSanityReadClient, brevoService, logger }) {
  if (!getSanityClient || !brevoService) {
    throw new Error('createEmailOutboxService requires getSanityClient and brevoService');
  }

  async function getSuppressedEmailSet(emails) {
    const normalized = Array.from(new Set(safeArray(emails).map(normalizeEmail).filter(Boolean)));
    if (!normalized.length) return new Set();

    const readClient = (getSanityReadClient && getSanityReadClient()) || getSanityClient();
    if (!readClient) return new Set();
    const rows = await readClient.fetch(
      '*[_type == "emailSubscriber" && email in $emails]{ email, status }',
      { emails: normalized }
    );
    const suppressedStatuses = new Set(['unsubscribed', 'bounced', 'complained', 'suppressed']);
    const suppressed = safeArray(rows)
      .filter((row) => suppressedStatuses.has(String(row?.status || '').toLowerCase()))
      .map((row) => normalizeEmail(row?.email));
    return new Set(suppressed);
  }

  async function enqueue({ payload, idempotencyKey, category = 'transactional', source = 'unknown', context = {} }) {
    const sc = getSanityClient();
    if (!sc) throw new Error('sanity-not-configured');
    if (!payload || typeof payload !== 'object') throw new Error('invalid-payload');

    const now = toIsoNow();
    const outboxId = stableOutboxId(idempotencyKey) || `email-outbox-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const existing = await sc.getDocument(outboxId).catch(() => null);
    if (existing) {
      return { id: outboxId, deduped: true, status: existing.status || 'queued' };
    }

    await sc.create({
      _id: outboxId,
      _type: 'emailOutbox',
      status: 'queued',
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
      idempotencyKey: idempotencyKey || outboxId,
      category,
      source,
      context,
      payload,
    });
    return { id: outboxId, deduped: false, status: 'queued' };
  }

  async function processBatch({ limit = 20, maxAttempts = 5 } = {}) {
    const sc = getSanityClient();
    if (!sc) throw new Error('sanity-not-configured');

    const now = toIsoNow();
    const docs = await sc.fetch(
      '*[_type == "emailOutbox" && status in ["queued","retry"] && (!defined(nextAttemptAt) || nextAttemptAt <= $now)] | order(createdAt asc)[0...200]{ _id, _rev, status, attempts, payload, idempotencyKey, category, source, context }',
      { now }
    );
    const batch = safeArray(docs).slice(0, Math.max(1, Math.min(200, Number(limit) || 20)));
    if (!batch.length) return { picked: 0, sent: 0, retried: 0, deadLetter: 0, skippedSuppressed: 0 };

    let sent = 0;
    let retried = 0;
    let deadLetter = 0;
    let skippedSuppressed = 0;

    for (const doc of batch) {
      const lockToken = crypto.randomBytes(8).toString('hex');
      const attempts = Number(doc?.attempts || 0);
      try {
        await sc.patch(doc._id)
          .ifRevisionId(doc._rev)
          .set({
            status: 'processing',
            processingStartedAt: now,
            processingLock: lockToken,
            updatedAt: now,
          })
          .commit();
      } catch (err) {
        continue;
      }

      try {
        const payload = doc?.payload || {};
        const recipients = extractRecipients(payload);
        const suppressed = await getSuppressedEmailSet(recipients);
        const filteredTo = safeArray(payload.to).filter((entry) => !suppressed.has(normalizeEmail(entry?.email)));
        if (!filteredTo.length) {
          skippedSuppressed += 1;
          await sc.patch(doc._id).set({
            status: 'dead_letter',
            updatedAt: toIsoNow(),
            finishedAt: toIsoNow(),
            deadLetterReason: 'all-recipients-suppressed',
            attempts: attempts + 1,
          }).unset(['processingLock', 'processingStartedAt']).commit();
          continue;
        }

        const finalPayload = { ...payload, to: filteredTo };
        await brevoService.sendEmail(finalPayload);
        sent += 1;
        await sc.patch(doc._id).set({
          status: 'sent',
          updatedAt: toIsoNow(),
          finishedAt: toIsoNow(),
          sentAt: toIsoNow(),
          attempts: attempts + 1,
          recipientCount: filteredTo.length,
        }).unset(['processingLock', 'processingStartedAt', 'nextAttemptAt', 'lastError', 'lastErrorAt']).commit();
      } catch (err) {
        const nextAttempt = attempts + 1;
        const errorSummary = String(err?.message || err || 'send-failed').slice(0, 500);
        const shouldDeadLetter = nextAttempt >= maxAttempts;
        if (shouldDeadLetter) {
          deadLetter += 1;
          await sc.patch(doc._id).set({
            status: 'dead_letter',
            updatedAt: toIsoNow(),
            finishedAt: toIsoNow(),
            attempts: nextAttempt,
            lastError: errorSummary,
            lastErrorAt: toIsoNow(),
            deadLetterReason: 'max-attempts-exceeded',
          }).unset(['processingLock', 'processingStartedAt']).commit();
        } else {
          retried += 1;
          await sc.patch(doc._id).set({
            status: 'retry',
            updatedAt: toIsoNow(),
            attempts: nextAttempt,
            nextAttemptAt: nextAttemptIso(nextAttempt),
            lastError: errorSummary,
            lastErrorAt: toIsoNow(),
          }).unset(['processingLock', 'processingStartedAt']).commit();
        }
        if (logger?.warn) {
          logger.warn(
            { outboxId: doc?._id, error: errorSummary, nextAttempt, deadLetter: shouldDeadLetter },
            'email outbox send failed'
          );
        }
      }
    }

    return { picked: batch.length, sent, retried, deadLetter, skippedSuppressed };
  }

  async function getStats() {
    const readClient = (getSanityReadClient && getSanityReadClient()) || getSanityClient();
    if (!readClient) throw new Error('sanity-not-configured');
    const result = await readClient.fetch(
      `{
        "queued": count(*[_type == "emailOutbox" && status in ["queued","retry"]]),
        "processing": count(*[_type == "emailOutbox" && status == "processing"]),
        "sent": count(*[_type == "emailOutbox" && status == "sent"]),
        "deadLetter": count(*[_type == "emailOutbox" && status == "dead_letter"]),
        "retry": count(*[_type == "emailOutbox" && status == "retry"])
      }`
    );
    return result || {};
  }

  return {
    enqueue,
    processBatch,
    getStats,
    stableOutboxId,
    sanitizeForId,
    normalizeEmail,
  };
}

module.exports = { createEmailOutboxService };
