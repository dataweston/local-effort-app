/**
 * Deterministic inbound-lead extractor.
 *
 * Reads gmail_sent_harvest ledger events (the founder's replies, which quote the
 * inbound inquiry) and detects genuine event leads — threads that carry real
 * event signal (≥2 of: guest count, occasion, event date) AND an inquiry verb.
 * Emits provisional `Customer —DISCUSSED_OFFER→ Offer` assertions with lead
 * metadata (occasion, guestCount, eventDate). Deterministic only.
 *
 * DISCUSSED_OFFER (not a new relType) is the right shape: "an offer was
 * discussed with an external party." It shares the Customer→Offer shape with
 * QUOTED, so a later quote enriches the same lead rather than forking it.
 *
 * Guards (via gmailExtractCommon): resolve to EXISTING Customer only, never the
 * business/founder identity, never mint. See docs/gmail-extraction-plan.md.
 */

const { getPrisma } = require('../utils/prisma');
const { bodyOf, recipientOf, classifyOffer, resolveCustomer, resolveOffer } = require('./gmailExtractCommon');

const GUEST_COUNT = /(\d{1,4})\s?(?:guests|people|pax|persons|ppl)\b/i;
const OCCASION = /\b(wedding|birthday|anniversary|graduation|holiday|corporate|reunion|shower|rehearsal|gala|funeral|memorial|retirement|dinner party|cocktail|bachelorette|gathering)\b/i;
// Event-date signal: M/D[/Y], OR a full/abbreviated month name FOLLOWED BY a day
// number (so "Nov 14" / "December 4" match but "marinated"/"marketing" don't).
// Word boundary + explicit month list, day 1–31 required.
const MONTHS = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const EVENT_DATE = new RegExp(
  `\\b(\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?|${MONTHS}\\.?\\s+(?:[12]?\\d|3[01])(?:st|nd|rd|th)?)\\b`,
  'i'
);
const INQUIRY = /\b(interested|inquiry|inquiring|looking for|hoping to|would love|can you|are you available|do you (?:cater|cook)|wondering if|reaching out|host(?:ing)?|planning|quote|book(?:ing)?)\b/i;

/**
 * Parse one ledger event into a lead candidate (or null).
 */
function parseLead(event) {
  const body = bodyOf(event.payload);
  if (!body) return null;

  const occ = body.match(OCCASION);
  const guests = body.match(GUEST_COUNT);
  const date = body.match(EVENT_DATE);
  const signalCount = [!!occ, !!guests, !!date].filter(Boolean).length;
  // Require ≥2 concrete event signals + an inquiry verb. This is the gate that
  // separates a real lead from chit-chat or a newsletter.
  if (signalCount < 2 || !INQUIRY.test(body)) return null;

  const recip = recipientOf(event.payload);
  return {
    occasion: occ ? occ[1].toLowerCase() : null,
    guestCount: guests ? Number(guests[1]) : null,
    eventDateText: date ? date[1] : null,
    offerName: classifyOffer(body),
    recipientEmail: recip?.email || null,
    recipientName: recip?.name || null,
    signalCount,
  };
}

/**
 * @param {object} opts { apply=false, logger }
 * @returns {{ scanned, leads, written, unresolved, results }}
 */
async function extractLeads({ apply = false, logger } = {}) {
  const prisma = getPrisma();
  const events = await prisma.ledgerEvent.findMany({
    where: { source: 'gmail_sent_harvest', tombstonedAt: null },
    select: { id: true, payload: true, occurredAt: true },
  });

  const results = [];
  let written = 0, unresolved = 0;

  for (const ev of events) {
    const lead = parseLead(ev);
    if (!lead) continue;

    const customer = await resolveCustomer(prisma, lead);
    const offer = customer ? await resolveOffer(prisma, lead.offerName) : null;
    const resolvable = !!(customer && offer);
    if (!resolvable) unresolved++;

    results.push({
      sourceId: ev.id,
      occurredAt: ev.occurredAt,
      ...lead,
      customer: customer ? { id: customer.id, name: customer.name } : null,
      offerResolved: offer ? offer.name : lead.offerName,
      resolvable,
    });

    if (apply && resolvable) {
      const metadata = {
        extractor: 'deterministic',
        isLead: true,
        occasion: lead.occasion,
        guestCount: lead.guestCount,
        eventDateText: lead.eventDateText,
        occurredAt: ev.occurredAt,
      };
      // Idempotency: one lead DISCUSSED_OFFER per (customer, offer, event).
      const existing = await prisma.brainAssertion.findFirst({
        where: { relType: 'DISCUSSED_OFFER', srcId: customer.id, dstId: offer.id, sourceId: ev.id, retractedAt: null },
        select: { id: true },
      });
      if (!existing) {
        await prisma.brainAssertion.create({
          data: {
            relType: 'DISCUSSED_OFFER',
            srcId: customer.id,
            dstId: offer.id,
            sourceId: ev.id,
            provisional: true,
            confidence: 0.6,
            sourceType: 'ledger_event',
            createdBy: 'lead_extractor',
            metadata,
          },
        });
        written++;
      }
    }
  }

  logger?.info({ scanned: events.length, leads: results.length, written, unresolved }, 'brain/lead: extraction complete');
  return { scanned: events.length, leads: results.length, written, unresolved, results };
}

module.exports = { extractLeads, parseLead };
