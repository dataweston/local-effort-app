const crypto = require('crypto');
const express = require('express');
const { writeLedgerEvent } = require('../brain/ledger');

const EVENT_CONFIG = Object.freeze({
  NegotiationCreatedV4: {
    eventType: 'lead.created',
    idField: 'negotiationID',
    occurredAtField: 'createdAt',
    actorType: 'customer',
    actorId: (data) => data?.customer?.customerID,
  },
  MessageCreatedV4: {
    eventType: 'lead.message.created',
    idField: 'messageID',
    occurredAtField: 'sentAt',
    actorType: (data) => String(data?.from || '').toLowerCase() || null,
    actorId: (data) => data?.customer?.customerID || data?.business?.businessID,
  },
  ReviewCreatedV4: {
    eventType: 'review.created',
    idField: 'reviewID',
    occurredAtField: 'createTime',
    actorType: 'customer',
    actorId: null,
  },
});

function timingSafeEqualText(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseBasicCredentials(header) {
  const match = String(header || '').match(/^Basic\s+([^\s]+)$/i);
  if (!match) return null;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) return null;
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

function resolveOccurredAt(payload, config) {
  const candidates = [
    payload?.data?.[config.occurredAtField],
    payload?.event?.triggeredAt,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && Number.isFinite(Date.parse(candidate))) {
      return candidate;
    }
  }
  return new Date().toISOString();
}

function resolveActorValue(value, data) {
  return typeof value === 'function' ? value(data) : value;
}

function createThumbtackRouter({
  logger,
  writeLedgerEventFn = writeLedgerEvent,
  username = process.env.THUMBTACK_WEBHOOK_USERNAME,
  password = process.env.THUMBTACK_WEBHOOK_PASSWORD,
  rateLimit = null,
} = {}) {
  const router = express.Router();
  const middleware = typeof rateLimit === 'function' ? [rateLimit] : [];

  router.post('/webhooks/thumbtack', ...middleware, async (req, res) => {
    try {
      if (!username || !password) {
        logger?.error?.('thumbtack webhook credentials are not configured');
        return res.status(503).json({ ok: false, error: 'webhook-not-configured' });
      }

      const credentials = parseBasicCredentials(req.get('authorization'));
      const authorized = credentials
        && timingSafeEqualText(credentials.username, username)
        && timingSafeEqualText(credentials.password, password);
      if (!authorized) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      }

      const payload = req.body;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(400).json({ ok: false, error: 'invalid-payload' });
      }

      const providerEventType = String(payload?.event?.eventType || '');
      const config = EVENT_CONFIG[providerEventType];
      if (!config) {
        logger?.warn?.({ providerEventType: providerEventType || null }, 'ignored unsupported thumbtack webhook event');
        return res.status(200).json({ ok: true, ignored: true });
      }

      const data = payload.data;
      const sourceId = data && typeof data === 'object' ? data[config.idField] : null;
      if (typeof sourceId !== 'string' || !sourceId.trim()) {
        return res.status(400).json({ ok: false, error: 'missing-event-id' });
      }

      const ledgerEvent = await writeLedgerEventFn({
        eventType: config.eventType,
        occurredAt: resolveOccurredAt(payload, config),
        source: 'thumbtack',
        sourceId: sourceId.trim(),
        actorType: resolveActorValue(config.actorType, data),
        actorId: resolveActorValue(config.actorId, data),
        payload,
      });

      logger?.info?.({
        providerEventType,
        sourceId: sourceId.trim(),
        deduped: !!ledgerEvent?._existing,
      }, 'thumbtack webhook event stored');

      return res.status(200).json({
        ok: true,
        stored: !ledgerEvent?._existing,
        deduped: !!ledgerEvent?._existing,
      });
    } catch (err) {
      logger?.error?.({ err }, 'thumbtack webhook processing failed');
      return res.status(500).json({ ok: false, error: 'webhook-failed' });
    }
  });

  return router;
}

module.exports = {
  EVENT_CONFIG,
  createThumbtackRouter,
  parseBasicCredentials,
  timingSafeEqualText,
};
