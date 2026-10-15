// Turns a Square payment failure into something a customer can act on, plus
// the machine-readable codes the owner needs to diagnose it. Square returns an
// `errors` array (and may return several at once, e.g. TRANSACTION_LIMIT plus
// ADDRESS_VERIFICATION_FAILURE); the raw array must never reach a customer.

const NOT_CHARGED = 'You have not been charged.';

// Ordered by how directly the customer can fix it. When Square reports more
// than one problem, the most fixable ones are shown first.
const CODE_MESSAGES = [
  ['ADDRESS_VERIFICATION_FAILURE', 'The billing ZIP code does not match the card. Check the ZIP code on your card statement.'],
  ['VERIFY_AVS_FAILURE', 'The billing ZIP code does not match the card. Check the ZIP code on your card statement.'],
  ['CVV_FAILURE', 'The security code (CVV) was not accepted. Check the 3 or 4 digits on your card.'],
  ['VERIFY_CVV_FAILURE', 'The security code (CVV) was not accepted. Check the 3 or 4 digits on your card.'],
  ['INVALID_EXPIRATION', 'The expiration date does not look right. Check it and try again.'],
  ['INVALID_EXPIRATION_DATE', 'The expiration date does not look right. Check it and try again.'],
  ['CARD_EXPIRED', 'This card has expired. Try a different card.'],
  ['PAN_FAILURE', 'The card number was not accepted. Check it, or try a different card.'],
  ['INVALID_CARD', 'The card number was not accepted. Check it, or try a different card.'],
  ['INSUFFICIENT_FUNDS', 'The card has insufficient funds. Try a different card.'],
  ['TRANSACTION_LIMIT', 'Your card issuer declined this amount. Try a different card or call your bank to approve the charge.'],
  ['PAYMENT_LIMIT_EXCEEDED', 'Your card issuer declined this amount. Try a different card or call your bank to approve the charge.'],
  ['CARD_NOT_SUPPORTED', 'This card type is not supported. Try a different card.'],
  ['CARD_DECLINED_VERIFICATION_REQUIRED', 'Your bank needs to verify this card. Try again and complete the bank prompt, or use a different card.'],
  ['CARD_DECLINED_CALL_ISSUER', 'Your bank declined this charge. Call the number on your card, or try a different card.'],
  ['CARD_DECLINED', 'Your card was declined. Try a different card or contact your bank.'],
  ['GENERIC_DECLINE', 'Your card was declined. Try a different card or contact your bank.'],
  ['VOICE_FAILURE', 'Your bank declined this charge. Call the number on your card, or try a different card.'],
];

const MESSAGE_BY_CODE = new Map(CODE_MESSAGES);
const CODE_ORDER = new Map(CODE_MESSAGES.map(([code], index) => [code, index]));

const CARD_FALLBACK = 'Your card could not be processed. Check the card details, or try a different card.';
const GENERIC_FALLBACK = 'The payment could not be completed.';

function squareErrors(error) {
  if (Array.isArray(error?.errors)) return error.errors;
  if (Array.isArray(error?.result?.errors)) return error.result.errors;
  return [];
}

/**
 * @returns {{ message: string, code: string|null, codes: string[], category: string|null, isPaymentError: boolean }}
 *   `message` is customer-safe and always states that no charge was made.
 *   `codes` are every Square code reported, in Square's order.
 */
function describePaymentError(error) {
  const errors = squareErrors(error);
  const codes = [...new Set(errors.map((entry) => entry?.code).filter(Boolean))];
  const category = errors.find((entry) => entry?.category)?.category || null;

  if (!errors.length) {
    return { message: null, code: null, codes: [], category: null, isPaymentError: false };
  }

  const known = codes
    .filter((code) => MESSAGE_BY_CODE.has(code))
    .sort((a, b) => CODE_ORDER.get(a) - CODE_ORDER.get(b));
  const sentences = [...new Set(known.map((code) => MESSAGE_BY_CODE.get(code)))].slice(0, 2);

  let body;
  if (sentences.length) body = sentences.join(' ');
  else if (category === 'PAYMENT_METHOD_ERROR') body = CARD_FALLBACK;
  else body = GENERIC_FALLBACK;

  return {
    message: `${body} ${NOT_CHARGED}`,
    code: codes[0] || null,
    codes,
    category,
    isPaymentError: true,
  };
}

module.exports = { describePaymentError, NOT_CHARGED };
