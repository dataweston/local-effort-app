const { getPrisma } = require('../utils/prisma');
const { findOrCreateEntity, writeLedgerEvent } = require('./ledger');

function daysBetween(a, b) { return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000; }
function candidateScore(invoice, payment) {
  const i = invoice.payload || {}; const p = payment.payload || {};
  let score = 0; const reasons = [];
  if (i.amountCents && Number(i.amountCents) === Number(p.amountCents)) { score += 0.45; reasons.push('exact_amount'); }
  if (i.currency && p.currency && i.currency === p.currency) score += 0.05;
  if (i.vendorEntityId && p.vendorEntityId && i.vendorEntityId === p.vendorEntityId) { score += 0.3; reasons.push('same_vendor'); }
  const ref = String(i.invoiceNumber || i.orderNumber || '').toLowerCase();
  if (ref && JSON.stringify(p).toLowerCase().includes(ref)) { score += 0.35; reasons.push('reference'); }
  const lag = daysBetween(invoice.occurredAt, payment.occurredAt);
  if (lag <= 3) score += 0.15; else if (lag <= 14) score += 0.1; else if (lag <= 45) score += 0.04;
  return { score: Math.min(1, score), reasons, lagDays: Math.round(lag * 10) / 10 };
}

async function reconcileVendorPayments({ apply = false, daysBack = 1095, logger } = {}) {
  const prisma = getPrisma(); const since = new Date(Date.now() - daysBack * 86400000);
  const [invoices, payments] = await Promise.all([
    prisma.ledgerEvent.findMany({ where: { eventType: { in: ['vendor.invoice.extracted', 'vendor.document.observed'] }, occurredAt: { gte: since }, tombstonedAt: null }, orderBy: { occurredAt: 'desc' } }),
    prisma.ledgerEvent.findMany({ where: { eventType: { in: ['vendor.payment.observed', 'payment.completed'] }, source: { in: ['square', 'square_vendor'] }, occurredAt: { gte: since }, tombstonedAt: null }, orderBy: { occurredAt: 'desc' } }),
  ]);
  const suggestions = [];
  for (const invoice of invoices) {
    const ranked = payments.map(payment => ({ payment, ...candidateScore(invoice, payment) })).filter(x => x.score >= 0.65).sort((a, b) => b.score - a.score);
    if (!ranked.length) continue;
    const best = ranked[0]; const unique = !ranked[1] || best.score - ranked[1].score >= 0.15;
    suggestions.push({ invoiceEventId: invoice.id, paymentEventId: best.payment.id, score: best.score, reasons: best.reasons, lagDays: best.lagDays, unique, autoEligible: unique && best.score >= 0.95 });
    if (!apply) continue;
    const invoiceEntity = (await findOrCreateEntity({ entityType: 'Invoice', name: `Invoice ${invoice.payload?.invoiceNumber || invoice.sourceId}`, properties: { ledgerEventId: invoice.id } })).entity;
    const paymentEntity = (await findOrCreateEntity({ entityType: 'Payment', name: `Square payment ${best.payment.sourceId}`, properties: { ledgerEventId: best.payment.id } })).entity;
    if (!invoiceEntity || !paymentEntity) continue;
    const event = await writeLedgerEvent({ eventType: 'vendor.payment.reconciliation_suggested', source: 'partner_layer', sourceId: `${invoice.id}:${best.payment.id}`, occurredAt: new Date(), payload: suggestions[suggestions.length - 1] });
    const exists = await prisma.brainAssertion.findFirst({ where: { srcId: invoiceEntity.id, dstId: paymentEntity.id, relType: 'RECONCILED_WITH', sourceId: event.id, retractedAt: null } });
    if (!exists) await prisma.brainAssertion.create({ data: { srcId: invoiceEntity.id, dstId: paymentEntity.id, relType: 'RECONCILED_WITH', sourceType: 'vendor_payment_matcher', sourceId: event.id, createdBy: 'vendor_payment_reconcile', provisional: !suggestions[suggestions.length - 1].autoEligible, confidence: best.score, metadata: { reasons: best.reasons, lagDays: best.lagDays } } });
  }
  const summary = { invoicesSeen: invoices.length, paymentsSeen: payments.length, suggestions: suggestions.length, autoEligible: suggestions.filter(s => s.autoEligible).length, itemsProcessed: invoices.length };
  logger?.info?.(summary, 'brain/partners: vendor payment reconciliation complete');
  return { ...summary, matches: suggestions.slice(0, 250) };
}
module.exports = { candidateScore, reconcileVendorPayments };
