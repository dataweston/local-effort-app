const CONTACT = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL || '';
const SENDER = process.env.SENDER_EMAIL || CONTACT;

const buildDirectSaleConfirmations = (flow, facts, { ownerEmail = CONTACT, senderEmail = SENDER } = {}) => {
  if (!facts || facts.flow !== flow || !facts.paymentId) throw new Error('sale-confirmation-facts-required');
  const amount = (Number(facts.totalCents || facts.amountCents || 0) / 100).toFixed(2);
  const customer = facts.customer || facts.buyer || {};
  const recipient = facts.recipient || {};
  const details = [
    `Payment: ${facts.paymentId}`,
    `Amount: $${amount}`,
    ...Object.entries(facts.details || {}).map(([key, value]) => `${key}: ${String(value ?? '')}`),
  ].join('\n');
  if (Array.isArray(facts.confirmationTemplates)) {
    const resolveCustomerEmail = (value) => {
      if (typeof value !== 'string' || !value.includes('{{customerEmail}}')) return value;
      if (!customer.email) throw new Error('sale-confirmation-customer-email-not-found');
      return value.replaceAll('{{customerEmail}}', customer.email);
    };
    return facts.confirmationTemplates
      .filter(({ role, payload }) => role && payload)
      .map(({ role, payload }) => ({
        role,
        payload: {
          ...payload,
          ...(Array.isArray(payload.to)
            ? { to: payload.to.map((recipient) => ({ ...recipient, email: resolveCustomerEmail(recipient.email) })) }
            : {}),
          ...(typeof payload.textContent === 'string'
            ? { textContent: resolveCustomerEmail(payload.textContent.replaceAll('{{paymentId}}', String(facts.paymentId))) }
            : {}),
        },
      }));
  }

  const from = { email: senderEmail, name: 'Local Effort' };
  const make = (role, email, name, subject, intro) => email ? {
    role,
    payload: {
      to: [{ email, ...(name ? { name } : {}) }],
      sender: from,
      subject,
      textContent: `${intro}\n\n${details}`,
    },
  } : null;
  const gift = flow === 'gift-card';
  return [
    make(gift ? 'buyer' : 'customer', customer.email, customer.name,
      gift ? 'Thanks for gifting Local Effort' : `${facts.title || 'Your Local Effort order'} confirmation`,
      gift ? 'Thank you for your Local Effort gift card purchase.' : 'Thank you for your purchase.'),
    ...(gift ? [make('recipient', facts.deliveryTarget === 'buyer' ? customer.email : recipient.email,
      facts.deliveryTarget === 'buyer' ? customer.name : recipient.name,
      'A Local Effort gift card for you', 'You received a Local Effort gift card.')] : []),
    make('owner', ownerEmail, 'Local Effort', `${facts.title || flow} sale confirmation`, 'A successful payment was received.'),
  ].filter(Boolean);
};

const recoverSaleConfirmations = async ({ attempt, order, payment, emailOutboxService, ownerEmail, senderEmail, prisma }) => {
  const metadata = attempt?.metadata || {};
  const facts = metadata.saleConfirmationFacts || order?.metadata?.saleConfirmationFacts;
  if (!facts) throw new Error('sale-confirmation-facts-not-found');
  const paymentId = payment?.id || attempt?.externalPaymentId || order?.paymentId;
  const completedPayment = payment
    ? payment.status === 'COMPLETED' ? payment : null
    : attempt?.status === 'succeeded' && paymentId
      ? { id: paymentId, status: 'COMPLETED' }
      : null;
  if (!paymentId || !completedPayment) {
    return { queued: 0, skipped: 'payment-not-completed' };
  }
  if (facts.flow === 'gift-card' && facts.confirmationReady !== true) {
    await require('./gift-card-checkout').completeGiftCardPurchase({
      attempt, payment: completedPayment, emailOutboxService,
      database: prisma, requireConfirmationQueue: true,
    });
    return { recovered: 'gift-card-fulfillment' };
  }
  const customer = facts.customer || facts.buyer || {};
  const recoveredFacts = {
    ...facts, paymentId,
    customer: {
      ...customer,
      email: customer.email || completedPayment.buyerEmailAddress || completedPayment.buyer_email_address || '',
    },
  };
  if (facts.flow === 'crowdfunding' && !recoveredFacts.customer.email) {
    throw new Error('sale-confirmation-customer-email-not-found');
  }
  return queueSaleConfirmations({
    emailOutboxService,
    payment: completedPayment,
    paymentId,
    confirmations: buildDirectSaleConfirmations(facts.flow, recoveredFacts, { ownerEmail, senderEmail }),
  });
};

const queueSaleConfirmations = async ({ emailOutboxService, payment, paymentId, confirmations }) => {
  if (payment?.status !== 'COMPLETED') return { queued: 0, skipped: 'payment-not-completed' };
  if (!paymentId || !emailOutboxService || typeof emailOutboxService.enqueue !== 'function') {
    throw new Error('Sale confirmation outbox is unavailable');
  }

  let queued = 0;
  for (const confirmation of confirmations || []) {
    const role = String(confirmation?.role || '').trim();
    const payload = confirmation?.payload;
    if (!role || !payload || !Array.isArray(payload.to) || !payload.to.length) continue;
    await emailOutboxService.enqueue({
      payload,
      idempotencyKey: `square-payment-${paymentId}-sale-confirmation-${role}`,
      category: 'transactional',
      source: 'sale-confirmation',
      context: { paymentId, role, tags: ['sale-confirmation'] },
    });
    queued += 1;
  }
  return { queued };
};

module.exports = { buildDirectSaleConfirmations, queueSaleConfirmations, recoverSaleConfirmations };
