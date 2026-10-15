// Queues the owner-only checkout-failure alert in the shared durable outbox and
// makes one immediate send attempt. Never throws: an alert problem must not
// change what the customer sees, and a queued-but-unsent alert is retried by the
// outbox worker (see docs/sale-confirmation-scheduler.md for its schedule status).

const { buildCheckoutFailureAlert } = require('../../backend/api/finance/checkoutFailureAdvice');

async function queueCheckoutFailureAlert({ emailOutboxService, ...details }) {
  try {
    const ownerEmail = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
    const senderEmail = process.env.SENDER_EMAIL || ownerEmail;
    if (!ownerEmail || !senderEmail) {
      console.error('[checkout-failure-alert] owner/sender email not configured; alert not queued');
      return { queued: false, reason: 'not-configured' };
    }
    if (!emailOutboxService || typeof emailOutboxService.enqueue !== 'function') {
      console.error('[checkout-failure-alert] outbox unavailable; alert not queued');
      return { queued: false, reason: 'outbox-unavailable' };
    }

    const { payload, idempotencyKey } = buildCheckoutFailureAlert({ ...details, ownerEmail, senderEmail });
    const queued = await emailOutboxService.enqueue({
      payload,
      idempotencyKey,
      category: 'transactional',
      source: 'checkout-failure-alert',
      context: { store: details.store, stage: details.stage, tags: ['checkout-failure-alert'] },
    });
    if (!queued.deduped && typeof emailOutboxService.processBatch === 'function') {
      await emailOutboxService.processBatch({ ids: [queued.id], limit: 1 });
    }
    return { queued: true, deduped: Boolean(queued.deduped) };
  } catch (err) {
    console.error('[checkout-failure-alert] failed:', err?.message);
    return { queued: false, reason: 'error' };
  }
}

module.exports = { queueCheckoutFailureAlert };
