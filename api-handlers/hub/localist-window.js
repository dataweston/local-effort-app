const crypto = require('crypto');
const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString, tableMissing } = require('./_http');

const BREVO_API_BASE = 'https://api.brevo.com/v3';
const BREVO_SENDABLE_STATUSES = new Set(['sent', 'queued', 'inprocess', 'processing', 'scheduled']);


function requestOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}

function localistUrl(req, token) {
  return `${requestOrigin(req)}/hub?localist=${encodeURIComponent(token)}`;
}

function normalizeSender(value) {
  const cleaned = String(value || '').replace(/[^a-zA-Z0-9]/g, '');
  if (/^\d+$/.test(cleaned)) return cleaned.slice(0, 15);
  return cleaned.slice(0, 11);
}

function parseListIds(value) {
  return String(value || '')
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => Number.isFinite(id));
}

function smsConfig() {
  const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || '';
  const listIds = parseListIds(
    process.env.BREVO_LOCALIST_LIST_ID
    || process.env.BREVO_LOCALIST_LIST_IDS
    || process.env.BREVO_LOCALIST_SMS_LIST_ID
    || '',
  );
  const sender = normalizeSender(process.env.BREVO_LOCALIST_SMS_SENDER || process.env.BREVO_SMS_SENDER || 'LocalEffort');
  return { apiKey, listIds, sender };
}

function publicSmsConfig() {
  const config = smsConfig();
  return {
    hasApiKey: !!config.apiKey,
    listIds: config.listIds,
    sender: config.sender,
    ready: !!config.apiKey && config.listIds.length > 0 && !!config.sender,
  };
}

function publicWindow(req, window) {
  const now = Date.now();
  const expiresAtMs = window?.expiresAt ? new Date(window.expiresAt).getTime() : 0;
  const valid = !!window?.active && Number.isFinite(expiresAtMs) && expiresAtMs > now;
  return {
    id: window.id,
    active: window.active,
    valid,
    closedReason: valid ? null : (window.active ? 'expired' : 'closed'),
    expiresAt: asIso(window.expiresAt),
    createdAt: asIso(window.createdAt),
    smsCampaignId: window.smsCampaignId || null,
    smsSentAt: asIso(window.smsSentAt),
    smsMessage: window.smsMessage || null,
    url: localistUrl(req, window.token),
  };
}

async function brevoRequest(path, options) {
  const { apiKey } = smsConfig();
  if (!apiKey) {
    const error = new Error('BREVO_API_KEY is not configured');
    error.status = 503;
    throw error;
  }

  const timeoutSignal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout
    ? AbortSignal.timeout(15000)
    : undefined;
  const headers = {
    accept: 'application/json',
    'api-key': apiKey,
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${BREVO_API_BASE}${path}`, {
    ...options,
    headers,
    signal: options.signal || timeoutSignal,
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_err) {
      data = { message: text };
    }
  }
  if (!response.ok) {
    const reason = data.message || data.error || data.code || response.statusText || 'Brevo request failed';
    const error = new Error(`Brevo ${response.status}: ${reason}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

async function sendSmsCampaign(req, window, message) {
  const { listIds, sender } = smsConfig();
  if (!listIds.length) {
    const error = new Error('BREVO_LOCALIST_LIST_ID is not configured or has no numeric list IDs');
    error.status = 503;
    throw error;
  }

  if (!sender) {
    const error = new Error('BREVO_LOCALIST_SMS_SENDER is invalid');
    error.status = 503;
    throw error;
  }

  const content = cleanString(message, 600) || `Local Effort Localist menu is live for 48 hours: ${localistUrl(req, window.token)} Reply STOP to opt out.`;
  const created = await brevoRequest('/smsCampaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: `Localist menu ${new Date().toISOString().slice(0, 10)}`,
      sender,
      content,
      recipients: { listIds },
    }),
  });

  await brevoRequest(`/smsCampaigns/${encodeURIComponent(created.id)}/sendNow`, {
    method: 'POST',
  });

  const campaign = await brevoRequest(`/smsCampaigns/${encodeURIComponent(created.id)}`, { method: 'GET' });
  const normalizedStatus = String(campaign.status || '').replace(/\s+/g, '').toLowerCase();
  if (campaign.status && !BREVO_SENDABLE_STATUSES.has(normalizedStatus)) {
    const error = new Error(`Brevo created campaign ${created.id}, but it was not queued. Current status: ${campaign.status}`);
    error.status = 502;
    error.details = campaign;
    throw error;
  }

  return {
    campaignId: Number(created.id),
    message: content,
    status: campaign.status || null,
    statistics: campaign.statistics || null,
  };
}

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  try {
    if (req.method === 'GET') {
      const token = cleanString(req.query?.token, 240);
      if (!token) return res.status(400).json({ error: 'token-required' });
      const window = await prisma.hubLocalistWindow.findUnique({ where: { token } });
      if (!window) return res.status(404).json({ error: 'Window not found' });
      return res.status(200).json({ ok: true, window: publicWindow(req, window) });
    }

    const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
    const denied = requireHubAccess(auth, { privileged: true });
    if (denied) return res.status(denied.status).json({ error: denied.error });

    const action = cleanString(req.body?.action, 40) || 'create';

    if (action === 'sendSms') {
      const token = cleanString(req.body?.token, 240);
      if (!token) return res.status(400).json({ error: 'token-required' });
      const window = await prisma.hubLocalistWindow.findUnique({ where: { token } });
      if (!window) return res.status(404).json({ error: 'Window not found' });
      if (!window.active || new Date(window.expiresAt) <= new Date()) {
        return res.status(410).json({ error: 'Window is closed' });
      }

      const sent = await sendSmsCampaign(req, window, req.body?.message);
      const updated = await prisma.hubLocalistWindow.update({
        where: { id: window.id },
        data: {
          smsCampaignId: sent.campaignId,
          smsSentAt: new Date(),
          smsMessage: sent.message,
        },
      });
      return res.status(200).json({
        ok: true,
        window: publicWindow(req, updated),
        brevo: {
          campaignId: sent.campaignId,
          status: sent.status,
          statistics: sent.statistics,
        },
      });
    }

    if (action === 'smsStatus') {
      return res.status(200).json({ ok: true, sms: publicSmsConfig() });
    }

    if (action !== 'create') return res.status(400).json({ error: 'unsupported-action' });

    const hours = Math.max(1, Math.min(Number(req.body?.hoursValid) || 48, 168));
    const window = await prisma.hubLocalistWindow.create({
      data: {
        token: crypto.randomBytes(32).toString('base64url'),
        expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
        createdByUserId: auth.viewer.userId || null,
      },
    });

    return res.status(201).json({ ok: true, window: publicWindow(req, window) });
  } catch (err) {
    console.error('[hub/localist-window] error', err);
    if (tableMissing(err)) {
      return res.status(503).json({ error: 'Localist window storage is not ready. Run Prisma migrations.' });
    }
    return res.status(err.status || 500).json({ error: err.message || 'Unable to manage Localist window' });
  }
};
