/**
 * Deterministic event-menu price extractor.
 *
 * Reads gmail_sent_harvest ledger events, finds genuine catering quotes
 * (a per-guest price like "$45-$65/person"), and emits provisional
 * `Customer —QUOTED→ Offer` assertions carrying the price + guest count in
 * metadata. Deterministic only — no LLM. Every quote is anchored to a real
 * sourceSpan so it can be trust-ranked in review.
 *
 * Why per-guest-only: gating on the "$N/person" SHAPE (not merely "$") is what
 * separates real quotes from noise like a Brooks shoe-refund email that happens
 * to contain "$25". See docs/brain-latent-signals.md Signal 1.
 *
 * Resolution rules (mirrors the self-identity discipline):
 *   - Recipient must resolve to an EXISTING Customer/Person entity — never mint.
 *   - Offer is classified by keyword into the existing Offer taxonomy.
 * A quote with no resolvable customer is reported but not written.
 */

const { getPrisma } = require('../utils/prisma');
const { bodyOf, recipientOf, classifyOffer, resolveCustomer, resolveOffer } = require('./gmailExtractCommon');

// "$45/person", "$45-$65/person", "$45 to 65 per guest", "$45/pp"
const PER_GUEST = /\$\s?(\d{1,4})(?:\s?[-–]\s?\$?\s?(\d{1,4})|\s?to\s?\$?\s?(\d{1,4}))?\s?(?:\/|per\s)\s?(?:person|guest|pp\b|head)/i;
const GUEST_COUNT = /(\d{1,4})\s?(?:guests|people|pax|persons|ppl)\b/i;

/**
 * Parse one ledger event into a quote candidate (or null).
 * @returns {null | { perGuestLow, perGuestHigh, guestCount, offerName, recipientEmail, recipientName, sourceSpan }}
 */
function parseQuote(event) {
  const body = bodyOf(event.payload);
  const m = PER_GUEST.exec(body);
  if (!m) return null;

  const low = Number(m[1]);
  const high = m[2] || m[3] ? Number(m[2] || m[3]) : null;
  // Sanity: catering per-guest prices live in a believable band.
  if (low < 10 || low > 1000) return null;

  const g = body.match(GUEST_COUNT);
  const guestCount = g ? Number(g[1]) : null;

  const recip = recipientOf(event.payload);
  // capture a readable span around the price match
  const idx = m.index;
  const sourceSpan = body.slice(Math.max(0, idx - 60), idx + 80).replace(/\s+/g, ' ').trim();

  return {
    perGuestLow: low,
    perGuestHigh: high,
    guestCount,
    offerName: classifyOffer(body),
    recipientEmail: recip?.email || null,
    recipientName: recip?.name || null,
    sourceSpan,
  };
}

/**
 * Run the extraction.
 * @param {object} opts
 * @param {boolean} opts.apply  write provisional assertions (default false = dry run)
 * @param {object}  opts.logger
 * @returns {{ scanned, quotes, written, unresolved, results }}
 */
async function extractMenuQuotes({ apply = false, logger } = {}) {
  const prisma = getPrisma();
  const events = await prisma.ledgerEvent.findMany({
    where: { source: 'gmail_sent_harvest', tombstonedAt: null },
    select: { id: true, payload: true, occurredAt: true },
  });

  const results = [];
  let written = 0, unresolved = 0;

  for (const ev of events) {
    const quote = parseQuote(ev);
    if (!quote) continue;

    const customer = await resolveCustomer(prisma, quote);
    const offer = customer ? await resolveOffer(prisma, quote.offerName) : null;
    const resolvable = !!(customer && offer);
    if (!resolvable) unresolved++;

    const record = {
      sourceId: ev.id,
      occurredAt: ev.occurredAt,
      ...quote,
      customer: customer ? { id: customer.id, name: customer.name } : null,
      offerResolved: offer ? offer.name : quote.offerName,
      resolvable,
    };
    results.push(record);

    if (apply && resolvable) {
      const perGuestLowCents = quote.perGuestLow * 100;
      const perGuestHighCents = (quote.perGuestHigh ?? quote.perGuestLow) * 100;
      const metadata = {
        extractor: 'deterministic',
        perGuestLowCents,
        perGuestHighCents,
        guestCount: quote.guestCount,
        totalLowCents: quote.guestCount ? perGuestLowCents * quote.guestCount : null,
        totalHighCents: quote.guestCount ? perGuestHighCents * quote.guestCount : null,
        sourceSpan: quote.sourceSpan,
        occurredAt: ev.occurredAt,
      };
      // Idempotency: one QUOTED per (customer, offer, ledger event).
      // NB: the FK scalar column is `sourceId` (relation is `ledgerEvent`).
      const existing = await prisma.brainAssertion.findFirst({
        where: { relType: 'QUOTED', srcId: customer.id, dstId: offer.id, sourceId: ev.id, retractedAt: null },
        select: { id: true },
      });
      if (!existing) {
        await prisma.brainAssertion.create({
          data: {
            relType: 'QUOTED',
            srcId: customer.id,
            dstId: offer.id,
            sourceId: ev.id,
            provisional: true,
            confidence: 0.7,
            sourceType: 'ledger_event',
            createdBy: 'menu_quote_extractor',
            metadata,
          },
        });
        written++;
      }
    }
  }

  logger?.info({ scanned: events.length, quotes: results.length, written, unresolved }, 'brain/menu-quote: extraction complete');
  return { scanned: events.length, quotes: results.length, written, unresolved, results };
}

module.exports = { extractMenuQuotes, parseQuote, classifyOffer };
