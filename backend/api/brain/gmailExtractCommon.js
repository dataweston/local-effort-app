/**
 * Shared helpers for deterministic gmail extractors (menu quotes, leads, …).
 *
 * Keeps body parsing, counterparty resolution, and offer classification in one
 * place so every extractor applies the SAME self-identity discipline:
 *   - resolve to EXISTING Customer/Person only — never mint
 *   - never resolve to a business/founder identity
 * See docs/gmail-extraction-plan.md.
 */

const { canonicalName } = require('./ledger');
const { checkSelfIdentity } = require('./selfIdentity');

// dataweston@gmail.com is the founder's personal address (on every sent thread);
// localeffortfood / brevosend / yum@ are business identities.
const OWN_ADDRESS = /localeffort|dataweston|brevosend|yum@/i;

// Offer taxonomy classification by keyword (first match wins).
const OFFER_RULES = [
  [/wedding/i, 'Wedding Catering'],
  [/pizza|pop-?up/i, 'Pizza Pop-Up'],
  [/corporate|office lunch|company/i, 'Corporate Lunch'],
  [/buffet|passed app|heavy app|platter/i, 'Private Dinner — Buffet'],
  [/seated|plated|course dinner|home dinner|private chef|dinner party|dinner at your home/i, 'Private Dinner — Seated'],
  [/wholesale|bread supply/i, 'Wholesale Bread Supply'],
  [/meal prep|weekly meal/i, 'Weekly Meal Prep'],
];
const DEFAULT_OFFER = 'Custom Menu Development';

function bodyOf(payload) {
  const pl = payload || {};
  return [pl.sentBodyPreview, pl.bodyPreview, pl.snippet, pl.subject].filter(Boolean).join('  ');
}

function extractEmail(addr) {
  const m = String(addr || '').match(/<([^>]+)>/) || String(addr || '').match(/([^\s,<]+@[^\s,>]+)/);
  return m ? m[1].toLowerCase() : null;
}

function extractName(addr) {
  const m = String(addr || '').match(/^\s*"?([^"<]+?)"?\s*</);
  return m ? m[1].trim() : null;
}

/**
 * First counterparty (non-own, non-business-identity) participant.
 * gmail_sent_harvest stores participants as objects {name,email,domain};
 * other sources may use "Name <email>" strings. Handles both.
 * @returns {null | { email, name }}
 */
function recipientOf(payload) {
  const pl = payload || {};
  const out = [];
  for (const part of pl.participants || []) {
    if (part && typeof part === 'object') {
      out.push({ email: (part.email || '').toLowerCase() || null, name: part.name || null });
    } else if (part) {
      out.push({ email: extractEmail(part), name: extractName(part) });
    }
  }
  if (!out.length) {
    for (const s of [pl.to, pl.cc].filter(Boolean)) out.push({ email: extractEmail(s), name: extractName(s) });
  }
  return out.find((r) => {
    if (r.email && OWN_ADDRESS.test(r.email)) return false;
    if (r.name && OWN_ADDRESS.test(r.name)) return false;
    if (r.name && checkSelfIdentity('Customer', r.name).blocked) return false;
    return r.email || r.name;
  }) || null;
}

function classifyOffer(text) {
  for (const [re, offer] of OFFER_RULES) if (re.test(text)) return offer;
  return DEFAULT_OFFER;
}

/** Resolve recipient to an EXISTING Customer/Person. Never mints, never a
 *  business/founder identity. */
async function resolveCustomer(prisma, { recipientEmail, recipientName }) {
  const ok = (ent) => (ent && !checkSelfIdentity(ent.entityType, ent.name).blocked ? ent : null);

  if (recipientEmail) {
    const byEmail = await prisma.brainEntity.findFirst({
      where: {
        entityType: { in: ['Customer', 'Person'] },
        tombstonedAt: null,
        OR: [
          { properties: { path: ['email'], equals: recipientEmail } },
          { aliases: { some: { alias: recipientEmail } } },
          { name: { equals: recipientEmail, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, entityType: true },
    });
    if (ok(byEmail)) return byEmail;
  }
  if (recipientName) {
    const byName = await prisma.brainEntity.findFirst({
      where: {
        entityType: { in: ['Customer', 'Person'] },
        tombstonedAt: null,
        OR: [
          { canonicalName: canonicalName(recipientName) },
          { name: { equals: recipientName, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, entityType: true },
    });
    if (ok(byName)) return byName;
  }
  return null;
}

async function resolveOffer(prisma, offerName) {
  return prisma.brainEntity.findFirst({
    where: { entityType: 'Offer', tombstonedAt: null, name: { equals: offerName, mode: 'insensitive' } },
    select: { id: true, name: true },
  });
}

module.exports = {
  OWN_ADDRESS,
  bodyOf,
  extractEmail,
  extractName,
  recipientOf,
  classifyOffer,
  resolveCustomer,
  resolveOffer,
};
