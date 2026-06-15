/**
 * Self-identity guard.
 *
 * The gmail/extractor pipelines repeatedly mint the business itself, its own
 * email addresses, and the founder as Customer/Vendor entities — e.g. the
 * Brevo notification address `dataweston@9846241.brevosend.com` became a
 * Customer, and the founder's own outbound invoices became Vendor self-loops
 * (see docs/brain-data-audit.md §1.2). This module centralises the blocklist
 * so the live mint path (findOrCreateEntity) and the offline cleanup script
 * apply identical rules.
 *
 * Scope is deliberately narrow: it only blocks names that are the business's
 * own contact identities, and only for role types where that's wrong
 * (Customer/Vendor/Supplier/Person). It does NOT touch Dish/Ingredient/etc.
 */

// Email domains/addresses that belong to the business, not a counterparty.
const OWN_ADDRESS_PATTERNS = [
  /@localeffortfood\.com$/i,
  /^dataweston@/i,
  /\.brevosend\.com$/i,
  /@9846241\.brevosend\.com$/i,
];

// The BUSINESS itself — never a counterparty of ANY role type (incl. Person).
const OWN_BUSINESS_NAMES = new Set([
  'local effort',
  'local effort food',
  'local effort pizza funder',
]);

// The FOUNDER — never a Customer/Vendor/Supplier (he's not a counterparty to his
// own business), but IS a legitimate Person (the operator). So founder names are
// blocked for counterparty roles only, not for Person.
const FOUNDER_NAMES = new Set([
  'weston smith',
  'weston',
]);

// Counterparty role types. The business is blocked from all of these AND Person;
// the founder is blocked from the counterparty ones but allowed as Person.
const COUNTERPARTY_TYPES = new Set(['Customer', 'Vendor', 'Supplier']);
const ROLE_TYPES = new Set(['Customer', 'Vendor', 'Supplier', 'Person']);

function canonical(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeOwnAddress(name) {
  const value = String(name || '').trim();
  if (!value) return false;
  return OWN_ADDRESS_PATTERNS.some((re) => re.test(value));
}

/**
 * Should an entity of (entityType, name) be blocked from minting / archived?
 * @returns {{ blocked: boolean, reason: string }}
 */
function checkSelfIdentity(entityType, name) {
  if (!ROLE_TYPES.has(entityType)) return { blocked: false, reason: '' };
  const c = canonical(name);

  // The business itself: blocked from every role type (incl. Person).
  if (OWN_BUSINESS_NAMES.has(c)) {
    return { blocked: true, reason: `business identity minted as ${entityType}` };
  }
  // An own email address as any counterparty/person role is wrong.
  if (looksLikeOwnAddress(name)) {
    return { blocked: true, reason: `own business address minted as ${entityType}` };
  }
  // The founder: blocked as a counterparty (Customer/Vendor/Supplier) but
  // allowed as a Person — he's the real operator entity.
  if (FOUNDER_NAMES.has(c) && COUNTERPARTY_TYPES.has(entityType)) {
    return { blocked: true, reason: `founder identity minted as ${entityType} (counterparty)` };
  }
  return { blocked: false, reason: '' };
}

module.exports = {
  checkSelfIdentity,
  looksLikeOwnAddress,
  ROLE_TYPES,
  COUNTERPARTY_TYPES,
  OWN_BUSINESS_NAMES,
  FOUNDER_NAMES,
  OWN_ADDRESS_PATTERNS,
};
