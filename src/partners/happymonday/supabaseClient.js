/**
 * Supabase client and helpers for Happy Monday partner portal
 */

import { supabase } from '../../lib/supabaseClient';

/**
 * Get current user from Happy Monday users table
 */
export const getCurrentHappyMondayUser = async (email) => {
  if (!supabase || !email) return null;

  const { data, error } = await supabase
    .from('happymonday_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) {
    console.error('[HappyMonday] Error fetching user:', error);
    return null;
  }

  return data;
};

/**
 * Get user's credit balance
 */
export const getUserCredit = async (userId) => {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('happymonday_credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[HappyMonday] Error fetching credits:', error);
    return null;
  }

  return data;
};

/**
 * Load all orders for a user (or all orders if admin)
 */
export const loadOrders = async (userId, isAdmin = false) => {
  if (!supabase) return [];

  let query = supabase
    .from('happymonday_orders')
    .select(`
      *,
      user:user_id(email, name, role),
      created_by_user:created_by(email, name, role)
    `)
    .order('created_at', { ascending: false });

  // If not admin, only show orders for this user
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[HappyMonday] Error loading orders:', error);
    return [];
  }

  return data || [];
};

/**
 * Create a new order
 */
export const createOrder = async ({
  userId,
  createdBy,
  orderNumber,
  orderDate,
  items,
  totalCents,
  notes,
  isClientOrder = false,
}) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('happymonday_orders')
    .insert({
      user_id: userId,
      created_by: createdBy,
      order_number: orderNumber,
      order_date: orderDate,
      items,
      total_cents: totalCents,
      notes,
      status: 'unpaid',
      email_sent: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[HappyMonday] Error creating order:', error);
    throw error;
  }

  // If this is a client order, trigger email notification
  if (isClientOrder && data) {
    try {
      await fetch('/api/happymonday/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.id }),
      });

      // Mark email as sent
      await supabase
        .from('happymonday_orders')
        .update({ email_sent: true })
        .eq('id', data.id);
    } catch (emailError) {
      console.error('[HappyMonday] Error sending email:', emailError);
      // Don't throw - order was created successfully
    }
  }

  return data;
};

/**
 * Update order status (admin only)
 */
export const updateOrderStatus = async (orderId, status) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('happymonday_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('[HappyMonday] Error updating order status:', error);
    throw error;
  }

  return data;
};

/**
 * Adjust user credit balance (admin only)
 */
export const adjustCreditBalance = async (userId, adjustmentCents, notes, processedBy) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Create payment record for the adjustment
  const { data: payment, error: paymentError } = await supabase
    .from('happymonday_payments')
    .insert({
      user_id: userId,
      amount_cents: adjustmentCents,
      payment_type: 'credit_adjustment',
      notes,
      processed_by: processedBy,
    })
    .select()
    .single();

  if (paymentError) {
    console.error('[HappyMonday] Error creating credit adjustment:', paymentError);
    throw paymentError;
  }

  return payment;
};

/**
 * Record a Square payment
 */
export const recordSquarePayment = async (userId, orderId, amountCents, squarePaymentId, processedBy) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('happymonday_payments')
    .insert({
      user_id: userId,
      order_id: orderId,
      amount_cents: amountCents,
      payment_type: 'square_ach',
      square_payment_id: squarePaymentId,
      processed_by: processedBy,
    })
    .select()
    .single();

  if (error) {
    console.error('[HappyMonday] Error recording payment:', error);
    throw error;
  }

  return data;
};

/**
 * Load costing data
 */
export const loadCosting = async () => {
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('happymonday_costing')
    .select('*');

  if (error) {
    console.error('[HappyMonday] Error loading costing:', error);
    return {};
  }

  // Convert array to object keyed by item_id
  const costingMap = {};
  (data || []).forEach(item => {
    costingMap[item.item_id] = {
      flour: Number(item.flour) || 0,
      meat: Number(item.meat) || 0,
      vegetables: Number(item.vegetables) || 0,
      dairy: Number(item.dairy) || 0,
      otherToppings: Number(item.other_toppings) || 0,
      packaging: Number(item.packaging) || 0,
      label: Number(item.label) || 0,
      custom: item.custom || [],
    };
  });

  return costingMap;
};

/**
 * Save costing data
 */
export const saveCosting = async (costs) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Convert object to array of records
  const records = Object.entries(costs).map(([itemId, values]) => ({
    item_id: parseInt(itemId),
    flour: values.flour || 0,
    meat: values.meat || 0,
    vegetables: values.vegetables || 0,
    dairy: values.dairy || 0,
    other_toppings: values.otherToppings || 0,
    packaging: values.packaging || 0,
    label: values.label || 0,
    custom: values.custom || [],
    updated_at: new Date().toISOString(),
  }));

  // Upsert all records
  const { error } = await supabase
    .from('happymonday_costing')
    .upsert(records, { onConflict: 'item_id' });

  if (error) {
    console.error('[HappyMonday] Error saving costing:', error);
    throw error;
  }

  return true;
};

export default {
  getCurrentHappyMondayUser,
  getUserCredit,
  loadOrders,
  createOrder,
  updateOrderStatus,
  adjustCreditBalance,
  recordSquarePayment,
  loadCosting,
  saveCosting,
};
