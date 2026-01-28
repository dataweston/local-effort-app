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
 * Get the client user ID (always returns Happy Monday client ID)
 * This is used to ensure all operations target the correct customer account
 */
export const getClientUserId = async () => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('happymonday_users')
    .select('id')
    .eq('email', 'hello@happymonday.company')
    .single();

  if (error) {
    console.error('[HappyMonday] Error fetching client user:', error);
    return null;
  }

 return data?.id || null;
};

/**
 * Canonical financial snapshot (opening credit + client-authored orders - payments)
 * Optionally repairs the stored happymonday_credits balance if it has drifted.
 */
export const getFinancialSnapshot = async ({ email, role, repair = false } = {}) => {
  if (!supabase) return null;

  const targetEmail = role === 'admin' ? 'hello@happymonday.company' : email;

  const { data, error } = await supabase.rpc('happymonday_financial_snapshot', {
    p_user_email: targetEmail,
    p_update_balance: repair,
  });

  if (error) {
    console.error('[HappyMonday] Error fetching financial snapshot:', error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    balance_cents: data.calculated_balance_cents ?? data.balance_cents ?? 0,
  };
};

/**
 * Get user's credit balance
 * NOTE: For admin users, this returns the CLIENT's credit balance since this is a
 * customer-provider portal where admin manages the client's account.
 */
export const getUserCredit = async (userId, userRole = null, userEmail = null) => {
  if (!supabase || !userId) return null;

  // Determine which account to read (client when admin is viewing)
  let targetUserId = userId;
  let targetEmail = userEmail;

  if (userRole === 'admin') {
    const clientId = await getClientUserId();
    if (clientId) {
      targetUserId = clientId;
      targetEmail = 'hello@happymonday.company';
    }
  }

  // Prefer canonical snapshot (self-heals stored balance if it drifted)
  const snapshot = await getFinancialSnapshot({
    email: targetEmail,
    role: userRole,
    repair: true,
  });

  if (snapshot) return snapshot;

  // Fallback to the raw credits table if snapshot is unavailable
  const { data, error } = await supabase
    .from('happymonday_credits')
    .select('*')
    .eq('user_id', targetUserId)
    .single();

  if (error) {
    console.error('[HappyMonday] Error fetching credits (fallback):', error);
    return null;
  }

  return data;
};

/**
 * Load all orders for a user (or all orders if admin)
 * NOTE: Since this is a single customer-provider portal, both users see ALL orders.
 * Orders are always associated with the client, but created_by tracks who made them.
 */
export const loadOrders = async () => {
  if (!supabase) return [];

  // Both admin and client see ALL orders in this portal
  // This is a single customer-provider relationship, not multi-customer
  const query = supabase
    .from('happymonday_orders')
    .select(`
      *,
      user:user_id(email, name, role),
      created_by_user:created_by(email, name, role)
    `)
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('[HappyMonday] Error loading orders:', error);
    return [];
  }

  return data || [];
};

/**
 * Create a new order
 * NOTE: In this customer-provider portal, ALL orders are for the client (hello@happymonday.company).
 * The created_by field tracks who actually created the order (admin or client).
 */
export const createOrder = async ({
  createdBy,
  orderNumber,
  orderDate,
  items,
  adjustments = [],
  totalCents,
  notes,
  isClientOrder = false,
}) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Always assign orders to the client user, regardless of who creates them
  const { data: clientUser } = await supabase
    .from('happymonday_users')
    .select('id')
    .eq('email', 'hello@happymonday.company')
    .single();

  if (!clientUser) {
    throw new Error('Client user not found');
  }

  const { data, error } = await supabase
    .from('happymonday_orders')
    .insert({
      user_id: clientUser.id, // Always the client
      created_by: createdBy, // Tracks who actually created it
      order_number: orderNumber,
      order_date: orderDate,
      items,
      adjustments,
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
 * Update unpaid order items, total, notes, date, and adjustments (admin only)
 * Supports negative quantities for credit entries and explicit adjustments
 */
export const updateOrder = async (orderId, { items, adjustments = [], totalCents, notes, orderDate, editedBy }) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.rpc('update_happymonday_order', {
    p_order_id: orderId,
    p_items: items,
    p_adjustments: adjustments,
    p_total_cents: totalCents,
    p_notes: notes || '',
    p_order_date: orderDate,
    p_edited_by: editedBy,
  });

  if (error) {
    console.error('[HappyMonday] Error updating order:', error);
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
  getClientUserId,
  getUserCredit,
  loadOrders,
  createOrder,
  updateOrder,
  updateOrderStatus,
  adjustCreditBalance,
  recordSquarePayment,
  getFinancialSnapshot,
  loadCosting,
  saveCosting,
};
