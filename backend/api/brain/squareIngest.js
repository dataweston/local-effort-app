/**
 * Disabled by default because local-budget is the source of truth for Square
 * transactions. Set BRAIN_INGEST_SQUARE_PAYMENTS=true only for deliberate
 * legacy payment ingestion.
 *
 * Square → Brain ingestion.
 * Called as a side-effect from the existing Square webhook handler in index.js.
 * Does not replace existing payment handling — runs alongside it.
 *
 * On COMPLETED payment:
 *   1. Write LedgerEvent (payment.completed)
 *   2. If merchant name matches a known Vendor entity → write ORDERED assertion
 *   3. Otherwise → create BrainInboxItem for founder triage
 */

const { writeLedgerEvent, findVendorByName, createInboxItem } = require('./ledger');

async function ingestSquarePayment(payment, { logger } = {}) {
  try {
    if (process.env.BRAIN_INGEST_SQUARE_PAYMENTS !== 'true') {
      if (logger?.debug) logger.debug({ squarePaymentId: payment?.id }, 'brain: square payment ingest disabled');
      return;
    }

    if (!payment?.id) return;
    if (String(payment.status || '').toUpperCase() !== 'COMPLETED') return;

    const occurredAt = payment.created_at || payment.createdAt || new Date().toISOString();
    const amountCents = Number(payment?.amount_money?.amount ?? payment?.amountMoney?.amount ?? 0);
    const merchantName = payment.note || payment.buyer_email_address || null;
    const squarePaymentId = payment.id;
    const locationId = payment.location_id || payment.locationId || null;
    const receiptUrl = payment.receipt_url || payment.receiptUrl || null;

    // 1. Write ledger event — immutable record
    const ledgerEvent = await writeLedgerEvent({
      eventType: 'payment.completed',
      occurredAt,
      source: 'square',
      sourceId: squarePaymentId,
      actorType: 'system',
      payload: {
        squarePaymentId,
        amountCents,
        merchantName,
        locationId,
        receiptUrl,
        status: payment.status,
        orderId: payment.order_id || payment.orderId || null,
        customerId: payment.customer_id || payment.customerId || null,
      },
    });

    // 2. Try to match to a known Vendor. The payment fact lives in the ledger
    // event (the inference engine reads payload.merchantName) — no graph
    // assertion is written, since a vendor→vendor self-edge violates the
    // relationship dictionary and gets auto-retracted by review automation.
    if (merchantName) {
      const vendorEntityId = await findVendorByName(merchantName);
      if (vendorEntityId) {
        if (logger?.info) logger.info({ squarePaymentId, vendorEntityId, ledgerEventId: ledgerEvent.id }, 'brain: square payment linked to vendor');
        return;
      }
    }

    // 3. No vendor match — create inbox item for triage
    const amountDollars = (amountCents / 100).toFixed(2);
    await createInboxItem({
      rawContent: `Square payment $${amountDollars}${merchantName ? ` from ${merchantName}` : ''} (${squarePaymentId})`,
      source: 'square',
      attachments: receiptUrl ? [{ url: receiptUrl, mimeType: 'text/html', label: 'Square receipt' }] : null,
    });

    if (logger?.info) logger.info({ squarePaymentId }, 'brain: square payment queued to inbox (no vendor match)');
  } catch (err) {
    // Never throw — brain ingestion is never allowed to break the payment flow
    if (logger?.error) logger.error({ err, squarePaymentId: payment?.id }, 'brain: square ingest error');
    else console.error('[brain/squareIngest] error', err?.message);
  }
}

module.exports = { ingestSquarePayment };
