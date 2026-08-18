/**
 * Localist roster → provider-neutral membership records.
 *
 * Membership today lives in the Supabase `localist_members` roster plus a set
 * of Square identifiers (customer, order, subscription). That works until you
 * ask a question the provider cannot answer — how many members were active in
 * March, what dues were owed versus collected, what happens when Square is no
 * longer the biller. This projects the roster into an agreement + subscription
 * per member so those questions have a home that outlives the processor.
 *
 * The hard rule from the staged plan: dues never mix with food orders. A
 * member's burrito is not membership revenue. Only the Square order minted by
 * the dues checkout (`localist_members.square_order_id`) is treated as a dues
 * payment; a payment merely made by the same Square customer is not, because
 * that is exactly how the two would blend.
 */

const TIER_TERMS = {
  monthly: { cadence: 'monthly', recurringBaseCents: 4500, label: 'Localist monthly membership' },
  annual: { cadence: 'annual', recurringBaseCents: 37500, label: 'Localist annual membership' },
  waived: { cadence: 'none', recurringBaseCents: 0, label: 'Localist waived membership' },
};

const SOURCE_SYSTEM = 'localist';
const BUSINESS_LINE_KEY = 'membership';

function subscriptionStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'active') return 'active';
  if (value === 'canceled' || value === 'cancelled') return 'canceled';
  if (value === 'checkout_started' || value === 'pending') return 'pending';
  return value || 'pending';
}

/** Roster rows are keyed on phone (its upsert conflict target). */
function memberSourceId(member) {
  return String(member?.id || member?.phone || '').trim();
}

async function projectMember({ prisma, member }) {
  const sourceId = memberSourceId(member);
  if (!sourceId) return { skipped: 'no-source-id' };

  const terms = TIER_TERMS[String(member.tier || '').toLowerCase()];
  if (!terms) return { skipped: `unknown-tier:${member.tier}` };

  const status = subscriptionStatus(member.status);
  const startAt = member.created_at ? new Date(member.created_at) : new Date();

  const agreement = await prisma.commercialAgreement.upsert({
    where: { sourceSystem_sourceId: { sourceSystem: SOURCE_SYSTEM, sourceId } },
    update: {
      status: status === 'canceled' ? 'ended' : 'active',
      counterpartyName: member.name || null,
      counterpartyEmail: member.email || null,
      title: terms.label,
    },
    create: {
      agreementType: 'membership',
      status: status === 'canceled' ? 'ended' : 'active',
      title: terms.label,
      counterpartyName: member.name || null,
      counterpartyEmail: member.email || null,
      businessLineKey: BUSINESS_LINE_KEY,
      effectiveAt: Number.isNaN(startAt.getTime()) ? new Date() : startAt,
      autoRenew: terms.cadence !== 'none',
      sourceSystem: SOURCE_SYSTEM,
      sourceId,
      terms: { tier: member.tier, cadence: terms.cadence, dues: terms.recurringBaseCents },
    },
  });

  const subscription = await prisma.commercialSubscription.upsert({
    where: { sourceSystem_sourceId: { sourceSystem: SOURCE_SYSTEM, sourceId } },
    update: {
      status,
      billingCadence: terms.cadence,
      recurringBaseCents: terms.recurringBaseCents,
      provider: member.square_subscription_id ? 'square' : null,
      providerSubscriptionId: member.square_subscription_id || null,
      canceledAt: status === 'canceled' ? (member.updated_at ? new Date(member.updated_at) : new Date()) : null,
    },
    create: {
      agreementId: agreement.id,
      status,
      billingCadence: terms.cadence,
      recurringBaseCents: terms.recurringBaseCents,
      startAt: Number.isNaN(startAt.getTime()) ? new Date() : startAt,
      provider: member.square_subscription_id ? 'square' : null,
      providerSubscriptionId: member.square_subscription_id || null,
      sourceSystem: SOURCE_SYSTEM,
      sourceId,
      metadata: { tier: member.tier, phone: member.phone || null },
    },
  });

  return { agreement, subscription, terms, status };
}

/**
 * Attach the dues payment that started this membership to its subscription.
 * Matched only through the roster's own `square_order_id` — the one identifier
 * that unambiguously belongs to a dues checkout.
 */
async function allocateDuesPayment({ prisma, member, subscription }) {
  const squareOrderId = member?.square_order_id;
  if (!squareOrderId) return { allocated: 0 };

  const transaction = await prisma.financePaymentTransaction.findFirst({
    where: { provider: 'square', metadata: { path: ['orderId'], equals: squareOrderId } },
  });
  if (!transaction) return { allocated: 0, reason: 'no-transaction-for-order' };

  await prisma.financePaymentAllocation.upsert({
    where: {
      transactionId_targetType_targetId: {
        transactionId: transaction.id,
        targetType: 'subscription',
        targetId: subscription.id,
      },
    },
    update: { amountCents: transaction.grossCents },
    create: {
      transactionId: transaction.id,
      targetType: 'subscription',
      targetId: subscription.id,
      amountCents: transaction.grossCents,
    },
  });

  return { allocated: transaction.grossCents, transactionId: transaction.id };
}

async function runLocalistProjection({ prisma, supabase, dryRun = false, logger = null }) {
  if (!prisma) throw new Error('Prisma is required');
  if (!supabase) throw new Error('Supabase is required');

  const { data: members, error } = await supabase
    .from('localist_members')
    .select('id, name, email, phone, tier, status, square_customer_id, square_order_id, square_subscription_id, created_at, updated_at');
  if (error) throw new Error(error.message || 'Unable to read localist_members');

  const summary = {
    members: members?.length || 0,
    subscriptionsWritten: 0,
    duesAllocatedCents: 0,
    skipped: [],
    byTier: {},
    dryRun,
  };

  for (const member of members || []) {
    const tier = String(member.tier || 'unknown').toLowerCase();
    summary.byTier[tier] = (summary.byTier[tier] || 0) + 1;
  }

  if (dryRun) return summary;

  for (const member of members || []) {
    try {
      const result = await projectMember({ prisma, member });
      if (result.skipped) {
        summary.skipped.push({ member: memberSourceId(member), reason: result.skipped });
        continue;
      }
      summary.subscriptionsWritten += 1;

      const dues = await allocateDuesPayment({ prisma, member, subscription: result.subscription });
      summary.duesAllocatedCents += dues.allocated || 0;
    } catch (err) {
      logger?.error?.({ err, member: memberSourceId(member) }, 'localist projection: member failed');
      summary.skipped.push({ member: memberSourceId(member), reason: err?.message || 'error' });
    }
  }

  const active = await prisma.commercialSubscription.aggregate({
    where: { sourceSystem: SOURCE_SYSTEM, status: 'active' },
    _sum: { recurringBaseCents: true },
    _count: true,
  });
  summary.activeSubscriptions = active?._count || 0;
  // Contracted dues at current terms, not a cash forecast: annual members are
  // counted at their annual price, and Local Budget remains the cash authority.
  summary.contractedDuesCents = Number(active?._sum?.recurringBaseCents || 0);

  return summary;
}

module.exports = {
  BUSINESS_LINE_KEY,
  SOURCE_SYSTEM,
  TIER_TERMS,
  allocateDuesPayment,
  projectMember,
  runLocalistProjection,
  subscriptionStatus,
};
