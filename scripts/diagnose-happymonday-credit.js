/**
 * Diagnostic script to check Happy Monday credit system
 * Run with: node scripts/diagnose-happymonday-credit.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnose() {
  console.log('='.repeat(80));
  console.log('HAPPY MONDAY CREDIT SYSTEM DIAGNOSTIC');
  console.log('='.repeat(80));

  // Get client user
  const { data: clientUser, error: userError } = await supabase
    .from('happymonday_users')
    .select('*')
    .eq('email', 'hello@happymonday.company')
    .single();

  if (userError || !clientUser) {
    console.error('❌ Error fetching client user:', userError);
    return;
  }

  console.log('\n📧 CLIENT USER:', clientUser.email);
  console.log('   User ID:', clientUser.id);

  // Get credit balance
  const { data: credit, error: creditError } = await supabase
    .from('happymonday_credits')
    .select('*')
    .eq('user_id', clientUser.id)
    .single();

  if (creditError) {
    console.error('❌ Error fetching credit:', creditError);
  } else {
    console.log('\n💰 STORED CREDIT BALANCE:');
    console.log('   Opening Credit:', formatCents(credit.opening_credit_cents));
    console.log('   Current Balance:', formatCents(credit.balance_cents));
    console.log('   Status:', credit.balance_cents < 0 ? '✅ Credit Available' : '⚠️ Amount Owed');
  }

  // Get all orders
  const { data: orders, error: ordersError } = await supabase
    .from('happymonday_orders')
    .select('*')
    .eq('user_id', clientUser.id)
    .order('order_date', { ascending: true });

  if (ordersError) {
    console.error('❌ Error fetching orders:', ordersError);
    return;
  }

  console.log('\n📋 ORDERS:');
  console.log('   Total orders:', orders.length);

  let clientAuthoredTotal = 0;
  let adminAuthoredTotal = 0;
  let paidTotal = 0;
  let unpaidTotal = 0;

  orders.forEach((order) => {
    const isClientAuthored = order.created_by === clientUser.id;
    console.log(`   • ${order.order_number || order.id}:`);
    console.log(`     Date: ${order.order_date}`);
    console.log(`     Amount: ${formatCents(order.total_cents)}`);
    console.log(`     Status: ${order.status}`);
    console.log(`     Created by: ${isClientAuthored ? 'CLIENT' : 'ADMIN'}`);
    console.log(`     Is Closed: ${order.is_closed ? 'Yes' : 'No'}`);

    if (isClientAuthored) {
      clientAuthoredTotal += order.total_cents;
    } else {
      adminAuthoredTotal += order.total_cents;
    }

    if (order.status === 'paid' || order.status === 'refunded') {
      paidTotal += order.total_cents;
    } else {
      unpaidTotal += order.total_cents;
    }
  });

  // Get all payments
  const { data: payments, error: paymentsError } = await supabase
    .from('happymonday_payments')
    .select('*')
    .eq('user_id', clientUser.id)
    .order('created_at', { ascending: true });

  if (paymentsError) {
    console.error('❌ Error fetching payments:', paymentsError);
    return;
  }

  console.log('\n💳 PAYMENTS:');
  console.log('   Total payments:', payments.length);

  let totalPayments = 0;
  payments.forEach((payment) => {
    console.log(`   • ${payment.payment_type}:`);
    console.log(`     Amount: ${formatCents(payment.amount_cents)}`);
    console.log(`     Date: ${payment.created_at}`);
    console.log(`     Notes: ${payment.notes || 'N/A'}`);
    totalPayments += payment.amount_cents;
  });

  // Calculate canonical balance
  console.log('\n🧮 CALCULATION SUMMARY:');
  console.log('   Opening Credit:', formatCents(-credit.opening_credit_cents));
  console.log('   + Client-authored orders:', formatCents(clientAuthoredTotal));
  console.log('   - Total payments:', formatCents(totalPayments));
  console.log('   ' + '-'.repeat(50));

  const calculatedBalance = -credit.opening_credit_cents + clientAuthoredTotal - totalPayments;
  console.log('   = CALCULATED balance:', formatCents(calculatedBalance));
  console.log('   Stored balance:', formatCents(credit.balance_cents));

  const drift = credit.balance_cents - calculatedBalance;
  if (Math.abs(drift) > 0) {
    console.log(`   ⚠️ DRIFT DETECTED: ${formatCents(drift)}`);
    console.log(`   The stored balance is ${drift > 0 ? 'higher' : 'lower'} than it should be.`);
  } else {
    console.log('   ✅ No drift - balances match!');
  }

  console.log('\n📊 BREAKDOWN BY STATUS:');
  console.log('   Client-authored orders:', formatCents(clientAuthoredTotal));
  console.log('   Admin-authored orders:', formatCents(adminAuthoredTotal));
  console.log('   Paid/Refunded orders:', formatCents(paidTotal));
  console.log('   Unpaid orders:', formatCents(unpaidTotal));

  // Call the financial snapshot function
  console.log('\n🔍 TESTING FINANCIAL SNAPSHOT FUNCTION:');
  const { data: snapshot, error: snapshotError } = await supabase.rpc(
    'happymonday_financial_snapshot',
    {
      p_user_email: 'hello@happymonday.company',
      p_update_balance: false, // Don't update, just report
    }
  );

  if (snapshotError) {
    console.error('❌ Error calling snapshot function:', snapshotError);
  } else {
    console.log('   Opening Credit:', formatCents(snapshot.opening_credit_cents));
    console.log('   Client Orders:', formatCents(snapshot.client_authored_order_total_cents));
    console.log('   Payments:', formatCents(snapshot.payment_total_cents));
    console.log('   Calculated Balance:', formatCents(snapshot.calculated_balance_cents));
    console.log('   Stored Balance:', formatCents(snapshot.stored_balance_cents));
    console.log('   Drift:', formatCents(snapshot.balance_drift_cents));
    console.log('   Open Invoices:', formatCents(snapshot.open_invoice_total_cents), `(${snapshot.open_invoice_count} orders)`);
    console.log('   Closed Invoices:', formatCents(snapshot.closed_invoice_total_cents), `(${snapshot.closed_invoice_count} orders)`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSIS COMPLETE');
  console.log('='.repeat(80));

  // Recommendations
  if (Math.abs(drift) > 0) {
    console.log('\n⚠️ RECOMMENDED ACTIONS:');
    console.log('1. Review the payment and order records above to identify the issue');
    console.log('2. Run the financial snapshot function with p_update_balance: true to fix:');
    console.log('   SELECT * FROM happymonday_financial_snapshot(\'hello@happymonday.company\', true);');
  }
}

function formatCents(cents) {
  const dollars = (cents || 0) / 100;
  return `$${dollars.toFixed(2)}`;
}

diagnose()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
