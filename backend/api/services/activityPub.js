const crypto = require('crypto');

function toIsoNow() {
  return new Date().toISOString();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableDocId(prefix, raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const hash = crypto.createHash('sha1').update(value).digest('hex');
  return `${prefix}-${hash}`;
}

function nextAttemptIso(attempt) {
  const minuteMs = 60 * 1000;
  const backoffMinutes = Math.min(5 * (2 ** Math.max(0, attempt - 1)), 24 * 60);
  return new Date(Date.now() + backoffMinutes * minuteMs).toISOString();
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return parsed.toString();
  } catch (err) {
    return '';
  }
}

function createHttpSignature({ method, requestUrl, body, privateKeyPem, keyId }) {
  const normalizedMethod = String(method || 'POST').toLowerCase();
  const parsedUrl = new URL(requestUrl);
  const path = `${parsedUrl.pathname}${parsedUrl.search || ''}`;
  const digestValue = `SHA-256=${crypto.createHash('sha256').update(body).digest('base64')}`;
  const dateValue = new Date().toUTCString();
  const signingString = [
    `(request-target): ${normalizedMethod} ${path}`,
    `host: ${parsedUrl.host}`,
    `date: ${dateValue}`,
    `digest: ${digestValue}`,
  ].join('\n');
  const signature = crypto.createSign('RSA-SHA256').update(signingString).end().sign(privateKeyPem, 'base64');
  const signatureHeader = `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`;
  return {
    digestValue,
    dateValue,
    signatureHeader,
  };
}

function createActivityPubService({
  getSanityClient,
  getSanityReadClient,
  logger,
  privateKeyPem = '',
  keyId = '',
  outboundAuthToken = '',
}) {
  if (!getSanityClient) {
    throw new Error('createActivityPubService requires getSanityClient');
  }

  const hasSigning = !!String(privateKeyPem || '').trim() && !!String(keyId || '').trim();
  const bearerToken = String(outboundAuthToken || '').trim();

  async function listFollowers({ status = 'active', limit = 20, offset = 0 } = {}) {
    const readClient = (getSanityReadClient && getSanityReadClient()) || getSanityClient();
    if (!readClient) throw new Error('sanity-not-configured');
    const boundedLimit = Math.max(1, Math.min(500, Number(limit) || 20));
    const boundedOffset = Math.max(0, Number(offset) || 0);
    const query = `{
      "total": count(*[_type == "activityPubFollower" && status == $status]),
      "items": *[_type == "activityPubFollower" && status == $status] | order(updatedAt desc)[$offset...$end]{
        _id,
        actorId,
        actorType,
        inboxUrl,
        sharedInboxUrl,
        profileUrl,
        status,
        lastSeenAt,
        createdAt,
        updatedAt
      }
    }`;
    const result = await readClient.fetch(query, {
      status: String(status || 'active'),
      offset: boundedOffset,
      end: boundedOffset + boundedLimit,
    });
    return {
      total: Number(result?.total || 0),
      items: safeArray(result?.items),
    };
  }

  async function upsertFollower({
    actorId,
    actorType = 'Person',
    inboxUrl,
    sharedInboxUrl = '',
    profileUrl = '',
    publicKeyPem = '',
    status = 'active',
  }) {
    const sc = getSanityClient();
    if (!sc) throw new Error('sanity-not-configured');
    const normalizedActorId = normalizeUrl(actorId);
    if (!normalizedActorId) throw new Error('invalid-actor-id');
    const normalizedInbox = normalizeUrl(inboxUrl);
    const normalizedSharedInbox = normalizeUrl(sharedInboxUrl);
    const normalizedProfile = normalizeUrl(profileUrl);
    const followerId = stableDocId('activitypub-follower', normalizedActorId);
    const now = toIsoNow();
    await sc.createIfNotExists({
      _id: followerId,
      _type: 'activityPubFollower',
      actorId: normalizedActorId,
      actorType: String(actorType || 'Person'),
      createdAt: now,
    });
    await sc.patch(followerId).set({
      actorId: normalizedActorId,
      actorType: String(actorType || 'Person'),
      inboxUrl: normalizedInbox || null,
      sharedInboxUrl: normalizedSharedInbox || null,
      profileUrl: normalizedProfile || null,
      publicKeyPem: String(publicKeyPem || '').trim() || null,
      status: String(status || 'active'),
      lastSeenAt: now,
      lastFollowedAt: String(status || 'active') === 'active' ? now : undefined,
      updatedAt: now,
    }).commit();
    return { id: followerId };
  }

  async function markFollowerInactive(actorId, reason = 'inactive') {
    const sc = getSanityClient();
    if (!sc) throw new Error('sanity-not-configured');
    const normalizedActorId = normalizeUrl(actorId);
    if (!normalizedActorId) return { updated: false };
    const followerId = stableDocId('activitypub-follower', normalizedActorId);
    if (!followerId) return { updated: false };
    const now = toIsoNow();
    await sc.createIfNotExists({
      _id: followerId,
      _type: 'activityPubFollower',
      actorId: normalizedActorId,
      createdAt: now,
    });
    await sc.patch(followerId).set({
      status: 'inactive',
      inactiveReason: String(reason || 'inactive').slice(0, 120),
      lastUnfollowedAt: now,
      updatedAt: now,
    }).commit();
    return { updated: true };
  }

  async function enqueueDelivery({
    activity,
    inboxUrl,
    actorId = '',
    idempotencyKey = '',
  }) {
    const sc = getSanityClient();
    if (!sc) throw new Error('sanity-not-configured');
    const normalizedInbox = normalizeUrl(inboxUrl);
    if (!normalizedInbox) throw new Error('invalid-inbox-url');
    if (!activity || typeof activity !== 'object') throw new Error('invalid-activity');
    const normalizedActorId = normalizeUrl(actorId);
    const dedupeKey = String(idempotencyKey || `${activity?.id || ''}|${normalizedActorId}|${normalizedInbox}`).trim();
    const docId = stableDocId('activitypub-delivery', dedupeKey)
      || `activitypub-delivery-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const existing = await sc.getDocument(docId).catch(() => null);
    if (existing) {
      return { id: docId, deduped: true, status: existing.status || 'queued' };
    }
    const now = toIsoNow();
    await sc.create({
      _id: docId,
      _type: 'activityPubDelivery',
      status: 'queued',
      attempts: 0,
      idempotencyKey: dedupeKey || docId,
      activityId: String(activity?.id || '').trim() || null,
      activityType: String(activity?.type || '').trim() || null,
      actorId: normalizedActorId || null,
      inboxUrl: normalizedInbox,
      payloadJson: JSON.stringify(activity),
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { id: docId, deduped: false, status: 'queued' };
  }

  async function processBatch({ limit = 20, maxAttempts = 5 } = {}) {
    const sc = getSanityClient();
    if (!sc) throw new Error('sanity-not-configured');
    const now = toIsoNow();
    const docs = await sc.fetch(
      '*[_type == "activityPubDelivery" && status in ["queued","retry"] && (!defined(nextAttemptAt) || nextAttemptAt <= $now)] | order(createdAt asc)[0...200]{ _id, _rev, status, attempts, inboxUrl, payloadJson }',
      { now }
    );
    const batch = safeArray(docs).slice(0, Math.max(1, Math.min(200, Number(limit) || 20)));
    if (!batch.length) return { picked: 0, sent: 0, retried: 0, deadLetter: 0 };

    let sent = 0;
    let retried = 0;
    let deadLetter = 0;

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
        const payload = JSON.parse(String(doc?.payloadJson || '{}'));
        const body = JSON.stringify(payload);
        const headers = {
          'content-type': 'application/activity+json',
          accept: 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
        };
        if (bearerToken) {
          headers.authorization = `Bearer ${bearerToken}`;
        }
        if (hasSigning) {
          const signing = createHttpSignature({
            method: 'POST',
            requestUrl: doc.inboxUrl,
            body,
            privateKeyPem,
            keyId,
          });
          headers.date = signing.dateValue;
          headers.digest = signing.digestValue;
          headers.signature = signing.signatureHeader;
        }
        const response = await fetch(doc.inboxUrl, {
          method: 'POST',
          headers,
          body,
        });
        if (!response.ok) {
          const responseText = await response.text().catch(() => '');
          const err = new Error(`delivery-http-${response.status}`);
          err.responseStatus = response.status;
          err.responseText = String(responseText || '').slice(0, 500);
          throw err;
        }
        sent += 1;
        const finishedAt = toIsoNow();
        await sc.patch(doc._id).set({
          status: 'sent',
          attempts: attempts + 1,
          updatedAt: finishedAt,
          finishedAt,
          lastResponseCode: response.status,
          lastAttemptAt: finishedAt,
        }).unset(['processingLock', 'processingStartedAt', 'nextAttemptAt', 'lastError', 'lastErrorAt']).commit();
      } catch (err) {
        const nextAttempt = attempts + 1;
        const shouldDeadLetter = nextAttempt >= maxAttempts;
        const responseStatus = Number(err?.responseStatus || 0) || null;
        const responseText = String(err?.responseText || '').trim();
        const errorSummary = String(responseText || err?.message || err || 'delivery-failed').slice(0, 500);
        const finishedAt = toIsoNow();
        if (shouldDeadLetter) {
          deadLetter += 1;
          await sc.patch(doc._id).set({
            status: 'dead_letter',
            attempts: nextAttempt,
            updatedAt: finishedAt,
            finishedAt,
            lastError: errorSummary,
            lastErrorAt: finishedAt,
            lastResponseCode: responseStatus,
            lastAttemptAt: finishedAt,
            deadLetterReason: 'max-attempts-exceeded',
          }).unset(['processingLock', 'processingStartedAt']).commit();
        } else {
          retried += 1;
          await sc.patch(doc._id).set({
            status: 'retry',
            attempts: nextAttempt,
            updatedAt: finishedAt,
            nextAttemptAt: nextAttemptIso(nextAttempt),
            lastError: errorSummary,
            lastErrorAt: finishedAt,
            lastResponseCode: responseStatus,
            lastAttemptAt: finishedAt,
          }).unset(['processingLock', 'processingStartedAt']).commit();
        }
        if (logger?.warn) {
          logger.warn(
            { deliveryId: doc?._id, responseStatus, error: errorSummary, deadLetter: shouldDeadLetter },
            'activitypub delivery failed'
          );
        }
      }
    }

    return { picked: batch.length, sent, retried, deadLetter };
  }

  async function getDeliveryStats() {
    const readClient = (getSanityReadClient && getSanityReadClient()) || getSanityClient();
    if (!readClient) throw new Error('sanity-not-configured');
    const result = await readClient.fetch(`{
      "queued": count(*[_type == "activityPubDelivery" && status in ["queued","retry"]]),
      "processing": count(*[_type == "activityPubDelivery" && status == "processing"]),
      "sent": count(*[_type == "activityPubDelivery" && status == "sent"]),
      "deadLetter": count(*[_type == "activityPubDelivery" && status == "dead_letter"]),
      "retry": count(*[_type == "activityPubDelivery" && status == "retry"])
    }`);
    return result || {};
  }

  return {
    listFollowers,
    upsertFollower,
    markFollowerInactive,
    enqueueDelivery,
    processBatch,
    getDeliveryStats,
    stableDocId,
    normalizeUrl,
  };
}

module.exports = {
  createActivityPubService,
};
