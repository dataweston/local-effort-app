const { sendInvoiceNotification } = require('./invoice-email');

// Supabase client for API
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (err) {
  console.warn('[HappyMonday] Supabase not available:', err.message);
}

/**
 * Send invoice notification email when client creates an order
 */
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Fetch order details from Supabase
    const { data: order, error: orderError } = await supabase
      .from('happymonday_orders')
      .select(`
        *,
        user:user_id(email, name),
        created_by_user:created_by(email, name)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[HappyMonday] Order not found:', orderError);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get items data (hardcoded item list - you may want to make this dynamic)
    const ITEMS = [
      { id: 1, name: "Egg Salad Sandwich", price: 5.1, category: "Sandwiches" },
      { id: 2, name: "Turkey Breast", price: 6.1, category: "Sandwiches" },
      { id: 3, name: "Roast Beef", price: 7.1, category: "Sandwiches" },
      { id: 4, name: "Pastrami", price: 7.1, category: "Sandwiches" },
      { id: 5, name: "Mortadella", price: 7.1, category: "Sandwiches" },
      { id: 6, name: "Vegetable", price: 6.1, category: "Sandwiches" },
      { id: 7, name: '12" Cheese', price: 7.1, category: "Pizza" },
      { id: 8, name: '4" Cheese', price: 3.6, category: "Pizza" },
      { id: 9, name: '12" Pepperoni', price: 8.1, category: "Pizza" },
      { id: 10, name: '12" Seasonal', price: 8.1, category: "Pizza" },
      { id: 11, name: '12" Gluten Free', price: 8.1, category: "Pizza" },
      { id: 12, name: "Beet Salad", price: 5.1, category: "Salads" },
      { id: 13, name: "Pasta Salad (gluten free)", price: 3.1, category: "Salads" },
      { id: 14, name: "Yogurt & Granola (gluten free)", price: 3.1, category: "Breakfast" },
      { id: 15, name: "Yogurt & Granola with chocolate (gluten free)", price: 4.1, category: "Breakfast" },
      { id: 16, name: "Chia Pudding", price: 3.1, category: "Breakfast" },
      { id: 17, name: "Chia Pudding (dairy free)", price: 4.1, category: "Breakfast" },
    ];

    // Convert items object to array with details
    const itemsArray = Object.entries(order.items).map(([itemId, quantity]) => {
      const itemInfo = ITEMS.find(i => i.id === parseInt(itemId));
      return {
        id: parseInt(itemId),
        name: itemInfo?.name || `Item ${itemId}`,
        category: itemInfo?.category || '',
        price: itemInfo?.price || 0,
        quantity,
      };
    });

    // Get current balance for the user
    const { data: credit } = await supabase
      .from('happymonday_credits')
      .select('balance_cents')
      .eq('user_id', order.user_id)
      .single();

    const currentBalance = credit?.balance_cents || 0;

    // Send email to both admin and client
    const recipientEmails = [
      'dataweston@gmail.com',
      'hello@happymonday.company',
    ];

    await sendInvoiceNotification({
      orderNumber: order.order_number,
      orderDate: order.order_date,
      items: itemsArray,
      totalCents: order.total_cents,
      notes: order.notes,
      clientName: order.user?.name || order.user?.email || 'Happy Monday',
      currentBalance,
      recipientEmails,
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully' });

  } catch (error) {
    console.error('[HappyMonday] Error sending invoice email:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      message: error.message,
    });
  }
};
