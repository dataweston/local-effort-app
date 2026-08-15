const { getSupabase } = require('../../backend/api/supabaseClient');

function paymentField(payment, camel, snake) {
  return payment?.[camel] ?? payment?.[snake] ?? null;
}

async function markLocalistMembershipPaidFromSquare(payment) {
  if (!payment || String(payment.status || '').toUpperCase() !== 'COMPLETED') {
    return { matched: false, updated: false, reason: 'payment-not-completed' };
  }

  const orderId = paymentField(payment, 'orderId', 'order_id');
  if (!orderId) {
    return { matched: false, updated: false, reason: 'square-order-id-missing' };
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase unavailable while activating Localist membership');

  const { data, error } = await supabase
    .from('localist_members')
    .select('*')
    .eq('square_order_id', orderId)
    .limit(1);
  if (error) throw new Error(error.message || error.code || 'Unable to find Localist membership');

  const member = Array.isArray(data) ? data[0] : null;
  if (!member) return { matched: false, updated: false, reason: 'membership-not-found' };

  const identifiers = {
    square_customer_id: paymentField(payment, 'customerId', 'customer_id'),
    square_subscription_id:
      paymentField(payment, 'subscriptionId', 'subscription_id') ||
      payment?.subscriptionDetails?.subscriptionId ||
      null,
  };
  const changes = {};
  if (member.status !== 'active') changes.status = 'active';
  for (const [column, value] of Object.entries(identifiers)) {
    if (value && member[column] !== value) changes[column] = value;
  }

  if (Object.keys(changes).length === 0) {
    return { matched: true, updated: false, memberId: member.id || null };
  }

  changes.updated_at = new Date().toISOString();
  let update = supabase.from('localist_members').update(changes);
  update = member.id ? update.eq('id', member.id) : update.eq('square_order_id', orderId);
  const { error: updateError } = await update;
  if (updateError) {
    throw new Error(updateError.message || updateError.code || 'Unable to activate Localist membership');
  }

  return { matched: true, updated: true, memberId: member.id || null };
}

module.exports = { markLocalistMembershipPaidFromSquare };
