/**
 * Controlled Brain relationship dictionary.
 *
 * Keep this file small and explicit. Ingestion code can still preserve raw facts
 * in LedgerEvent payloads, but BrainAssertion.relType should come from this list
 * unless a new relation has been deliberately added here.
 */

const ANY = ['*'];

const RELATIONSHIPS = {
  ABOUT: {
    src: ['Note'],
    dst: ANY,
    inverseLabel: 'HAS_NOTE',
    selfEdge: false,
    promote: 'never',
    description: 'A note is about an entity.',
  },
  ASSIGNED_TO: {
    src: ['Task'],
    dst: ['Person', 'Customer', 'Vendor', 'StaffRole', 'Group'],
    inverseLabel: 'HAS_ASSIGNED_TASK',
    selfEdge: false,
    promote: 'never',
    description: 'A task is assigned to a person, customer, vendor, staff role, or group.',
  },
  ATTACHED_TO: {
    src: ['Task', 'Note'],
    dst: ['Event', 'Menu', 'Shift', 'Resource', 'Customer', 'Vendor', 'Order'],
    inverseLabel: 'HAS_ATTACHMENT',
    selfEdge: false,
    promote: 'never',
    description: 'A task or note is attached to an operational object.',
  },
  APPEARS_ON: {
    src: ['Dish', 'Product'],
    dst: ['Menu', 'Offer', 'Event'],
    inverseLabel: 'HAS_ITEM',
    selfEdge: false,
    promote: 'never',
    description: 'A dish or product appeared on a menu, offer, or event.',
  },
  CONTAINS: {
    src: ['Recipe', 'Dish', 'Product'],
    dst: ['Ingredient'],
    inverseLabel: 'USED_IN',
    selfEdge: false,
    promote: 'never',
    description: 'A recipe/dish/product contains an ingredient.',
  },
  PRICED_AT: {
    src: ['Ingredient', 'Product', 'Dish'],
    dst: ['Vendor', 'Supplier', 'Channel'],
    inverseLabel: 'SELLS_AT_PRICE',
    selfEdge: false,
    promote: 'when_repeated',
    eventNodeType: 'PriceQuote',
    description: 'A thing had a quoted or observed price from a seller/source.',
  },
  SUPPLIES: {
    src: ['Vendor', 'Supplier'],
    dst: ['Ingredient', 'Product'],
    inverseLabel: 'SUPPLIED_BY',
    selfEdge: false,
    promote: 'never',
    description: 'A vendor supplies an ingredient or product.',
  },
  SUPPLIED_BY: {
    src: ['Ingredient', 'Product'],
    dst: ['Vendor', 'Supplier'],
    inverseLabel: 'SUPPLIES',
    selfEdge: false,
    aliasFor: 'SUPPLIES',
    description: 'Legacy inverse of SUPPLIES. Prefer Vendor -> SUPPLIES -> Ingredient.',
  },
  ORDERED: {
    src: ['Customer', 'Person', 'Vendor'],
    dst: ['Dish', 'Menu', 'Product', 'Offer', 'Order'],
    inverseLabel: 'ORDERED_BY',
    selfEdge: false,
    promote: 'when_has_line_items',
    eventNodeType: 'Order',
    description: 'A customer/vendor ordered a thing. Promote rich orders to Order nodes.',
  },
  PAYMENT_SENT: {
    src: ['Person', 'Vendor', 'Customer', 'BusinessLine'],
    dst: ['Vendor', 'Supplier', 'Person', 'Invoice', 'Payment'],
    inverseLabel: 'RECEIVED_PAYMENT_FROM',
    selfEdge: false,
    promote: 'when_reconciled_or_split',
    eventNodeType: 'Payment',
    description: 'Money was sent to a payee. Promote payments needing reconciliation.',
  },
  PAYMENT_RECEIVED: {
    src: ['Customer', 'Person', 'Channel'],
    dst: ['BusinessLine', 'Offer', 'Invoice', 'Payment'],
    inverseLabel: 'RECEIVED_FROM',
    selfEdge: false,
    promote: 'when_reconciled_or_split',
    eventNodeType: 'Payment',
    description: 'Money was received from a payer.',
  },
  INVOICED: {
    src: ['Vendor', 'Supplier', 'BusinessLine'],
    dst: ['Customer', 'Vendor', 'Invoice'],
    inverseLabel: 'WAS_INVOICED_BY',
    selfEdge: false,
    promote: 'usually',
    eventNodeType: 'Invoice',
    description: 'An invoice was issued or received.',
  },
  MENU_SNAPSHOT: {
    src: ['Menu'],
    dst: ['Menu'],
    inverseLabel: 'SNAPSHOT_OF',
    selfEdge: true,
    promote: 'never',
    description: 'Metadata snapshot for a Menu entity. Self-edge is intentional.',
  },
  GAVE_FEEDBACK: {
    src: ['Customer', 'Person'],
    dst: ['Dish', 'Menu', 'Offer', 'Feedback'],
    inverseLabel: 'RECEIVED_FEEDBACK_FROM',
    selfEdge: false,
    promote: 'when_rich_text',
    eventNodeType: 'Feedback',
    description: 'A customer gave feedback about a dish/menu/offer.',
  },
  RSVP_TO: {
    src: ['Person', 'Customer'],
    dst: ['Event'],
    inverseLabel: 'HAS_RSVP',
    selfEdge: false,
    promote: 'when_status_changes',
    eventNodeType: 'RSVP',
    description: 'A person or customer RSVP status was recorded for an event.',
  },
  CHECKED_IN_TO: {
    src: ['Person', 'Customer'],
    dst: ['Event', 'Shift'],
    inverseLabel: 'HAS_CHECKIN',
    selfEdge: false,
    promote: 'usually',
    eventNodeType: 'CheckIn',
    description: 'A person or customer checked in to an event or shift.',
  },
  ACKNOWLEDGED: {
    src: ['Person', 'Customer', 'Vendor'],
    dst: ['Resource'],
    inverseLabel: 'ACKNOWLEDGED_BY',
    selfEdge: false,
    promote: 'when_required',
    eventNodeType: 'Acknowledgement',
    description: 'A person, customer, or vendor acknowledged a resource such as an SOP or policy.',
  },
  BELONGS_TO: {
    src: ['Event', 'Shift', 'Resource'],
    dst: ['Group'],
    inverseLabel: 'HAS_OBJECT',
    selfEdge: false,
    promote: 'never',
    description: 'An operational object belongs to a gated group.',
  },
  SCHEDULED_FOR: {
    src: ['Shift'],
    dst: ['Event', 'Group'],
    inverseLabel: 'HAS_SCHEDULED_SHIFT',
    selfEdge: false,
    promote: 'never',
    description: 'A shift is scheduled for an event or group.',
  },
  EMAILED: {
    src: ['Person', 'Customer', 'Vendor'],
    dst: ['Person', 'Customer', 'Vendor'],
    inverseLabel: 'EMAILED_BY',
    selfEdge: false,
    promote: 'when_thread_has_decisions',
    eventNodeType: 'EmailThread',
    description: 'A person/entity emailed another person/entity.',
  },
  EVIDENCES: {
    src: ['Note', 'EmailThread', 'Invoice', 'Receipt', 'Payment'],
    dst: ANY,
    inverseLabel: 'EVIDENCED_BY',
    selfEdge: false,
    promote: 'never',
    description: 'A source artifact supports an entity or assertion.',
  },
  EVIDENCED_BY: {
    src: ANY,
    dst: ['Note', 'EmailThread', 'Invoice', 'Receipt', 'Payment'],
    inverseLabel: 'EVIDENCES',
    selfEdge: false,
    promote: 'never',
    description: 'Legacy inverse of EVIDENCES.',
  },
  RECONCILED_WITH: {
    src: ['Receipt', 'Invoice', 'Payment', 'LedgerTransaction'],
    dst: ['Receipt', 'Invoice', 'Payment', 'LedgerTransaction'],
    inverseLabel: 'RECONCILED_WITH',
    selfEdge: false,
    promote: 'usually',
    eventNodeType: 'Reconciliation',
    description: 'Two financial artifacts were matched.',
  },
  PAID_TO: {
    src: ['Payment'],
    dst: ['Vendor', 'Supplier', 'Person', 'Customer'],
    inverseLabel: 'WAS_PAID_BY',
    selfEdge: false,
    promote: 'never',
    description: 'A payment was paid to a payee.',
  },
  PAID_BY: {
    src: ['Payment'],
    dst: ['Person', 'Customer', 'BusinessLine', 'Channel'],
    inverseLabel: 'MADE_PAYMENT',
    selfEdge: false,
    promote: 'never',
    description: 'A payment was made by a payer.',
  },
  ISSUED_BY: {
    src: ['Invoice', 'Receipt', 'PriceQuote'],
    dst: ['Vendor', 'Supplier', 'BusinessLine'],
    inverseLabel: 'ISSUED',
    selfEdge: false,
    promote: 'never',
    description: 'An artifact was issued by a vendor, supplier, or business line.',
  },
  BILLED_TO: {
    src: ['Invoice'],
    dst: ['Customer', 'Person', 'BusinessLine'],
    inverseLabel: 'WAS_BILLED',
    selfEdge: false,
    promote: 'never',
    description: 'An invoice was billed to a party.',
  },
  INCLUDES: {
    src: ['Invoice', 'Receipt', 'Order', 'Payment', 'EmailThread'],
    dst: ['Ingredient', 'Product', 'Dish', 'Menu', 'Offer'],
    inverseLabel: 'INCLUDED_IN',
    selfEdge: false,
    promote: 'never',
    description: 'An artifact includes a line item or referenced thing.',
  },
  SENT_TO: {
    src: ['EmailThread'],
    dst: ['Person', 'Customer', 'Vendor'],
    inverseLabel: 'RECEIVED_THREAD',
    selfEdge: false,
    promote: 'never',
    description: 'An email thread was sent to a participant.',
  },
  SENT_BY: {
    src: ['EmailThread'],
    dst: ['Person', 'Customer', 'Vendor'],
    inverseLabel: 'SENT_THREAD',
    selfEdge: false,
    promote: 'never',
    description: 'An email thread was sent by a participant.',
  },
  SPEND_HISTORY: {
    src: ['Vendor', 'Supplier'],
    dst: ['Metric', 'BusinessLine'],
    inverseLabel: 'HAS_SPEND_HISTORY',
    selfEdge: false,
    promote: 'when_periodic',
    eventNodeType: 'Metric',
    description: 'Aggregated spend over a period.',
  },
  VERSION_OF: {
    src: ['Recipe'],
    dst: ['Dish', 'Product'],
    inverseLabel: 'HAS_VERSION',
    selfEdge: false,
    promote: 'never',
    description: 'Recipe version belongs to a dish/product.',
  },
  REALIZED_IN: {
    src: ['Batch'],
    dst: ['Recipe'],
    inverseLabel: 'HAS_BATCH',
    selfEdge: false,
    promote: 'never',
    description: 'A batch realized a recipe.',
  },
  DISCUSSED_OFFER: {
    src: ['Customer', 'Person', 'Vendor'],
    dst: ['Offer'],
    inverseLabel: 'DISCUSSED_WITH',
    selfEdge: false,
    promote: 'when_thread_has_decisions',
    eventNodeType: 'EmailThread',
    description: 'An offer was discussed with an external party.',
  },
  MENTIONED_OCCASION: {
    src: ['Customer', 'Person', 'Event'],
    dst: ['Occasion'],
    inverseLabel: 'MENTIONED_BY',
    selfEdge: false,
    promote: 'when_event_specific',
    eventNodeType: 'Event',
    description: 'An occasion was mentioned in context.',
  },
  SERVES_SEGMENT: {
    src: ['Offer', 'Channel', 'BusinessLine'],
    dst: ['CustomerSegment'],
    inverseLabel: 'SERVED_BY',
    selfEdge: false,
    promote: 'never',
    description: 'An offer/channel/business line serves a customer segment.',
  },
  TRIGGERED_BY_OCCASION: {
    src: ['Offer', 'BusinessLine'],
    dst: ['Occasion'],
    inverseLabel: 'TRIGGERS',
    selfEdge: false,
    promote: 'never',
    description: 'An occasion triggers demand for an offer.',
  },
  USES_CHANNEL: {
    src: ['Customer', 'CustomerSegment', 'Offer', 'BusinessLine'],
    dst: ['Channel'],
    inverseLabel: 'CHANNEL_USED_BY',
    selfEdge: false,
    promote: 'never',
    description: 'An entity uses or is associated with a sales/communication channel.',
  },
  LISTED_ON: {
    src: ['Dish', 'Product', 'Offer'],
    dst: ['Channel'],
    inverseLabel: 'LISTS',
    selfEdge: false,
    promote: 'never',
    description: 'A saleable item is listed on a sales channel such as Square.',
  },
  CONSTRAINED_BY: {
    src: ['Offer', 'BusinessLine', 'ProcessStep', 'Menu', 'Recipe'],
    dst: ['Constraint'],
    inverseLabel: 'CONSTRAINS',
    selfEdge: false,
    promote: 'never',
    description: 'A thing is limited by a constraint.',
  },
  GENERATES_REVENUE_FOR: {
    src: ['Offer', 'Channel', 'Product'],
    dst: ['BusinessLine'],
    inverseLabel: 'HAS_REVENUE_SOURCE',
    selfEdge: false,
    promote: 'never',
    description: 'A saleable thing generates revenue for a business line.',
  },
  CREATES_CONTENT_ANGLE: {
    src: ['NarrativeTheme', 'Offer', 'Dish'],
    dst: ['Offer', 'Channel', 'NarrativeTheme'],
    inverseLabel: 'HAS_CONTENT_ANGLE',
    selfEdge: false,
    promote: 'never',
    description: 'A theme or product creates a content angle.',
  },
  HAS_MARGIN_DRIVER: {
    src: ['Offer', 'Dish', 'Product', 'Recipe'],
    dst: ['Asset', 'ProcessStep', 'Ingredient', 'Vendor'],
    inverseLabel: 'DRIVES_MARGIN_FOR',
    selfEdge: false,
    promote: 'never',
    description: 'A factor influences margin.',
  },
  USES_WORDING: {
    src: ['Person', 'BusinessLine'],
    dst: ['Note', 'Pattern'],
    inverseLabel: 'WORDING_USED_BY',
    selfEdge: false,
    promote: 'never',
    description: 'An actor used a wording sample.',
  },
  USES_WORDING_PATTERN: {
    src: ['Person', 'BusinessLine'],
    dst: ['Pattern'],
    inverseLabel: 'WORDING_PATTERN_USED_BY',
    selfEdge: false,
    promote: 'never',
    description: 'An actor repeatedly used a wording pattern.',
  },
  USDA_VERIFIED: {
    src: ['Ingredient', 'Product'],
    dst: ['Vendor', 'Supplier', 'Note'],
    inverseLabel: 'VERIFIES_USDA',
    selfEdge: false,
    promote: 'never',
    description: 'A USDA-related verification was observed.',
  },
  CONTRACTED: {
    src: ['Customer', 'Vendor', 'BusinessLine'],
    dst: ['Offer', 'Event', 'Vendor', 'Customer'],
    inverseLabel: 'CONTRACTED_BY',
    selfEdge: false,
    promote: 'usually',
    eventNodeType: 'Contract',
    description: 'A contract or commitment exists.',
  },
};

function normalizeRelType(relType) {
  return String(relType || '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
}

function relationDefinition(relType) {
  return RELATIONSHIPS[normalizeRelType(relType)] || null;
}

function typeAllowed(allowed, entityType) {
  return allowed.includes('*') || allowed.includes(entityType);
}

function validateRelationship({ relType, srcType, dstType, srcId, dstId }) {
  const normalized = normalizeRelType(relType);
  const def = RELATIONSHIPS[normalized];
  const warnings = [];
  const errors = [];

  if (!def) {
    warnings.push(`Unknown relType ${normalized}; add it to relationshipDictionary.js before relying on it.`);
    return { ok: true, relType: normalized, warnings, errors, definition: null };
  }

  if (srcType && !typeAllowed(def.src, srcType)) {
    warnings.push(`${normalized} usually starts from ${def.src.join('|')}, got ${srcType}.`);
  }
  if (dstType && !typeAllowed(def.dst, dstType)) {
    warnings.push(`${normalized} usually points to ${def.dst.join('|')}, got ${dstType}.`);
  }
  if (srcId && dstId && srcId === dstId && !def.selfEdge) {
    warnings.push(`${normalized} is not modeled as a self-edge; consider promoting the event to a node.`);
  }

  return { ok: errors.length === 0, relType: normalized, warnings, errors, definition: def };
}

module.exports = {
  ANY,
  RELATIONSHIPS,
  normalizeRelType,
  relationDefinition,
  validateRelationship,
};
