/**
 * Food entity name validator.
 *
 * Detects the sentence-fragment Dish/Ingredient/Menu names the gmail extractor
 * minted mid-sentence (e.g. "dish. i could do a tenderloin or",
 * "with 100% locally sourced ingredients. We offer"). See
 * docs/brain-data-audit.md §1.2 — ~19% of active Dishes are fragments.
 *
 * Extracted from entityRoutes.js so the offline cleanup script and the live
 * assertion-review path share one definition of "valid food name".
 */

const FOOD_ENTITY_TYPES = new Set(['Dish', 'Ingredient', 'Menu']);
const FOOD_SIGNOFF_PREFIXES = /^(thanks|thank you|regards|best|cheers|sincerely|hello|hi)\b/i;

function compactText(value, max = 900) {
  if (value == null) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Is `name` a plausible name for a food entity of `entityType`?
 * Returns false for sentence fragments, addresses, URLs, long prose, sign-offs.
 */
function foodNameLooksValid(name, entityType) {
  const value = compactText(name, 120);
  if (!value) return false;
  if (value.length < 3 || value.length > 90) return false;
  if (/[@]|\bhttps?:\/\/|\bwww\./i.test(value)) return false;
  if (/\d{3,}/.test(value)) return false;
  if (FOOD_SIGNOFF_PREFIXES.test(value)) return false;

  const wordCount = value.split(/\s+/).filter(Boolean).length;
  if (entityType === 'Ingredient') {
    if (wordCount > 6) return false;
    if (!/^[a-zA-Z][a-zA-Z\s\-,'()&]+$/.test(value)) return false;
  }
  if (entityType === 'Dish') {
    if (wordCount > 12) return false;
  }
  if (entityType === 'Menu') {
    if (wordCount > 14) return false;
  }
  return true;
}

/**
 * Fragment test tuned for the BULK ARCHIVE pass — deliberately narrower than
 * foodNameLooksValid (which is for human-reviewed assertions). It targets only
 * the gmail mid-sentence prose the audit flagged, and must NOT catch catalog
 * names like "Pear Bartlett 80-90Ct" or "Broccoli 14 Ct" (real Co-op
 * Partners ingredients with pack counts).
 *
 * A name is a fragment iff ANY of:
 *   - starts lowercase AND opens with a pronoun/preposition/conjunction stub
 *     ("dish. i could do a tenderloin or", "with 100% locally sourced…")
 *   - contains mid-string sentence punctuation (". " or "? " or "! ") with a
 *     following word — i.e. it's spanning a sentence boundary
 *   - is implausibly long prose: > 12 words (Dish) / > 8 words (Ingredient)
 *   - contains an @ or URL (address/link captured as a food name)
 *
 * Digits, units, slashes, and counts on their own are NOT fragments.
 */
const FRAGMENT_LEAD = /^(i|we|you|they|it|he|she|with|from|and|but|or|so|the|a|an|of|to|for|in|on|at|this|that|here|there|could|would|i'?d|i'?ll)\b\s+\w/i;
const MID_SENTENCE = /[.?!]\s+[a-z]/i;

function isFoodFragment(name, entityType) {
  if (!FOOD_ENTITY_TYPES.has(entityType)) return false;
  const value = compactText(name, 160);
  if (!value) return false;

  if (/[@]|\bhttps?:\/\/|\bwww\./i.test(value)) return true;
  if (/^[a-z]/.test(value) && FRAGMENT_LEAD.test(value)) return true;
  if (MID_SENTENCE.test(value)) return true;

  const wordCount = value.split(/\s+/).filter(Boolean).length;
  if (entityType === 'Ingredient' && wordCount > 8) return true;
  if (wordCount > 12) return true;

  return false;
}

// Email-subject smell for Menu entities minted from gmail subject lines
// ("Rent is PAST DUE", "🍕 New Pledge: …", "Following up"). Lower confidence
// than isFoodFragment — these should be REVIEWED, not bulk-archived, because a
// few real menu threads ("Re: February Home Dinners") also match.
const MENU_SUBJECT_SMELL = [
  /^(re|fwd|fw):/i,
  /[🎉🍕📣📧✉️]/u,
  /\bnew pledge\b/i,
  /\bpast due\b/i,
  /^rent\b|\brent\.\.\./i,
  /^following up\b/i,
  /^lol\b/i,
  /\bpresale order\b/i,
  /\border\b.*\bconfirmation\b/i,
  /\binquiry$/i,
  /^(how (does|can|do)|what sorts|i get the vibe)/i,
];

function looksLikeEmailSubject(name) {
  const v = compactText(name, 120);
  if (!v) return false;
  return MENU_SUBJECT_SMELL.some((re) => re.test(v));
}

module.exports = { foodNameLooksValid, isFoodFragment, looksLikeEmailSubject, FOOD_ENTITY_TYPES, compactText };
