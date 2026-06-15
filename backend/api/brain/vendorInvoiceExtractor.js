/**
 * Deterministic vendor-invoice extractor (ALLOWLIST-ONLY).
 *
 * The old pipeline's worst failure was reading the founder's own outbound
 * invoices, and Intuit/QuickBooks/tax SaaS billing, as "vendors billing the
 * business" — creating self-loops and junk Vendor nodes (audit §1.2). So this
 * extractor is deliberately HIGH-PRECISION / LOW-RECALL:
 *
 *   - Emits an edge ONLY when the sender domain is on an explicit food-supply
 *     ALLOWLIST. Everything else (SaaS, tax, payment processors, gmail) → skip.
 *   - Resolves to an EXISTING Vendor entity — never mints.
 *   - Records `EMAILED` (Vendor → the business contact) with invoice metadata —
 *     a CONTACT/EVIDENCE signal, NOT a payment. Vendor *spend/payment* is Local
 *     Budget's authority (docs/local-budget-payment-export-brief.md); this
 *     extractor never asserts money moved.
 *
 * See docs/gmail-extraction-plan.md (#4).
 */

const { getPrisma } = require('../utils/prisma');

// Known food-supply vendor domains (from the live invoice-email audit). Map
// each to the canonical Vendor name we expect in the graph (alias-matched).
// domain → canonical Vendor entity name (verified against the live graph).
// foodbuilding.com is the Bakers' Field flour/bread vendor's billing domain.
const VENDOR_ALLOWLIST = {
  'greatciao.com': 'Great Ciao',
  'pohlfood.com': 'Pohl Food',
  'foodbuilding.com': "Bakers' Field Flour & Bread LLC",
  'thegoodacre.org': 'The Good Acre',
  'libertynatural.com': 'Liberty Natural',
  'caterrent.com': 'Caterrent',
};

// Explicitly NOT vendors even though they send "invoice" emails: software, tax,
// payment processors. Recorded so the intent is auditable.
const BLOCKED_DOMAINS = /intuit\.com|turbotax|quickbooks|stripe\.com|squareup\.com|tesasoftware\.com|gmail\.com/i;

const INVOICE = /\b(invoice|receipt|statement|amount due|order confirmation|bill)\b/i;

function senderDomain(payload) {
  const from = (payload && payload.from) || '';
  const m = String(from).match(/@([\w.-]+)/);
  return m ? m[1].toLowerCase() : null;
}

/** @returns {null | { domain, vendorName, subject }} */
function parseInvoice(event) {
  const pl = event.payload || {};
  const text = `${pl.subject || ''} ${pl.snippet || ''}`;
  if (!INVOICE.test(text)) return null;

  const domain = senderDomain(pl);
  if (!domain || BLOCKED_DOMAINS.test(domain)) return null;

  // Allowlist match (exact or subdomain of an allowlisted domain).
  const key = Object.keys(VENDOR_ALLOWLIST).find((d) => domain === d || domain.endsWith(`.${d}`));
  if (!key) return null;

  return { domain, vendorName: VENDOR_ALLOWLIST[key], subject: pl.subject || '' };
}

async function resolveVendor(prisma, vendorName) {
  return prisma.brainEntity.findFirst({
    where: {
      entityType: { in: ['Vendor', 'Supplier'] },
      tombstonedAt: null,
      OR: [
        { name: { equals: vendorName, mode: 'insensitive' } },
        { aliases: { some: { alias: { equals: vendorName, mode: 'insensitive' } } } },
      ],
    },
    select: { id: true, name: true },
  });
}

// The business contact entity the vendor emailed (the Person "Weston Smith").
async function resolveBusinessContact(prisma) {
  return prisma.brainEntity.findFirst({
    where: { entityType: 'Person', tombstonedAt: null, name: { contains: 'Weston', mode: 'insensitive' } },
    select: { id: true, name: true },
  });
}

async function extractVendorInvoices({ apply = false, logger } = {}) {
  const prisma = getPrisma();
  const events = await prisma.ledgerEvent.findMany({
    where: { eventType: 'email.thread', source: 'gmail', tombstonedAt: null },
    select: { id: true, payload: true, occurredAt: true },
  });

  const contact = await resolveBusinessContact(prisma);
  const results = [];
  let written = 0, unresolved = 0;

  for (const ev of events) {
    const inv = parseInvoice(ev);
    if (!inv) continue;

    const vendor = await resolveVendor(prisma, inv.vendorName);
    const resolvable = !!(vendor && contact);
    if (!resolvable) unresolved++;

    results.push({
      sourceId: ev.id,
      occurredAt: ev.occurredAt,
      ...inv,
      vendor: vendor ? { id: vendor.id, name: vendor.name } : null,
      resolvable,
    });

    if (apply && resolvable) {
      const existing = await prisma.brainAssertion.findFirst({
        where: { relType: 'EMAILED', srcId: vendor.id, dstId: contact.id, sourceId: ev.id, retractedAt: null },
        select: { id: true },
      });
      if (!existing) {
        await prisma.brainAssertion.create({
          data: {
            relType: 'EMAILED',
            srcId: vendor.id,
            dstId: contact.id,
            sourceId: ev.id,
            provisional: true,
            confidence: 0.65,
            sourceType: 'ledger_event',
            createdBy: 'vendor_invoice_extractor',
            metadata: {
              extractor: 'deterministic',
              kind: 'vendor_invoice_contact',
              senderDomain: inv.domain,
              subject: inv.subject,
              occurredAt: ev.occurredAt,
              note: 'contact/evidence only — not a payment (payments come from Local Budget)',
            },
          },
        });
        written++;
      }
    }
  }

  logger?.info({ scanned: events.length, invoices: results.length, written, unresolved }, 'brain/vendor-invoice: extraction complete');
  return { scanned: events.length, invoices: results.length, written, unresolved, results };
}

module.exports = { extractVendorInvoices, parseInvoice, VENDOR_ALLOWLIST };
