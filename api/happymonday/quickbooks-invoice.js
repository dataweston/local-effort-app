/**
 * Create QuickBooks Invoice
 * Creates a bookkeeping-only invoice in Happy Monday's QuickBooks when requested
 */

const QB_ENVIRONMENT = process.env.QUICKBOOKS_ENVIRONMENT || 'production';
const QB_API_BASE = QB_ENVIRONMENT === 'sandbox'
  ? 'https://sandbox-quickbooks.api.intuit.com'
  : 'https://quickbooks.api.intuit.com';

// Supabase client
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (err) {
  console.warn('[HappyMonday] Supabase not available:', err.message);
}

// Menu items (should match frontend)
const MENU_ITEMS = [
  { id: 1, name: "Egg Salad Sandwich", price: 5.1, category: "Sandwiches" },
  { id: 2, name: "Turkey Breast", price: 6.1, category: "Sandwiches" },
  { id: 3, name: "Roast Beef", price: 7.1, category: "Sandwiches" },
  { id: 4, name: "Pastrami", price: 7.1, category: "Sandwiches" },
  { id: 5, name: "Mortadella", price: 7.1, category: "Sandwiches" },
  { id: 20, name: "salame cotto", price: 7.1, category: "Sandwiches" },
  { id: 6, name: "Vegetable", price: 6.1, category: "Sandwiches" },
  { id: 7, name: '12" Cheese', price: 7.1, category: "Pizza" },
  { id: 8, name: '4" Cheese', price: 3.6, category: "Pizza" },
  { id: 9, name: '4" Pepperoni', price: 3.6, category: "Pizza" },
  { id: 10, name: '12" Pepperoni', price: 8.1, category: "Pizza" },
  { id: 11, name: '12" Seasonal', price: 8.1, category: "Pizza" },
  { id: 12, name: '12" Supreme', price: 8.1, category: "Pizza" },
  { id: 13, name: '12" Gluten Free', price: 8.1, category: "Pizza" },
  { id: 14, name: "Beet Salad", price: 5.1, category: "Salads" },
  { id: 15, name: "Pasta Salad (gluten free)", price: 3.1, category: "Salads" },
  { id: 16, name: "Yogurt & Granola (gluten free)", price: 3.1, category: "Breakfast" },
  { id: 17, name: "Yogurt & Granola with chocolate (gluten free)", price: 4.1, category: "Breakfast" },
  { id: 18, name: "Chia Pudding", price: 3.1, category: "Breakfast" },
  { id: 19, name: "Chia Pudding (dairy free)", price: 4.1, category: "Breakfast" },
];

async function refreshQuickBooksToken(integration) {
  const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
  const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
  
  const basicAuth = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh QuickBooks token');
  }

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

  // Update tokens in database
  await supabase
    .from('happymonday_integrations')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider', 'quickbooks');

  return tokens.access_token;
}

async function getValidAccessToken(integration) {
  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();
  
  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshQuickBooksToken(integration);
  }
  
  return integration.access_token;
}

async function updateOrderQuickBooksSync(orderId, updates) {
  if (!supabase || !orderId) return;
  await supabase
    .from('happymonday_orders')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
}

const ALLOWED_ORIGINS = ['https://localeffortfood.com', 'https://www.localeffortfood.com'];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('happymonday_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Prevent duplicate sends
    if (order.qb_sync_status === 'sent' || order.qb_invoice_id) {
      return res.status(400).json({
        error: 'Already sent',
        message: 'This invoice has already been sent to QuickBooks.',
      });
    }

    // Get QuickBooks integration
    const { data: integration, error: integrationError } = await supabase
      .from('happymonday_integrations')
      .select('*')
      .eq('provider', 'quickbooks')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      await updateOrderQuickBooksSync(orderId, {
        qb_sync_status: 'error',
        qb_sync_error: 'QuickBooks not connected',
      });

      return res.status(400).json({
        error: 'QuickBooks not connected',
        message: 'Please connect QuickBooks in the Settings tab first'
      });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(integration);

    // Build invoice line items
    const lineItems = [];
    for (const [itemId, quantity] of Object.entries(order.items)) {
      const menuItem = MENU_ITEMS.find(m => m.id === parseInt(itemId));
      if (!menuItem) continue;

      lineItems.push({
        DetailType: 'SalesItemLineDetail',
        Amount: menuItem.price * quantity,
        Description: menuItem.name,
        SalesItemLineDetail: {
          Qty: quantity,
          UnitPrice: menuItem.price,
        },
      });
    }
    const adjustments = Array.isArray(order.adjustments) ? order.adjustments : [];
    adjustments.forEach((adj, index) => {
      const amount = (adj.amount_cents || 0) / 100;
      if (!amount) return;
      lineItems.push({
        DetailType: 'SalesItemLineDetail',
        Amount: amount,
        Description: adj.description?.trim() || 'Credit Adjustment',
        SalesItemLineDetail: {
          Qty: 1,
          UnitPrice: amount,
        },
      });
    });

    // Create QuickBooks invoice
    // Note: In production, you'd need to set up a Customer in QuickBooks for "Local Effort"
    const invoiceData = {
      Line: lineItems,
      CustomerRef: {
        // This would be the QuickBooks Customer ID for "Local Effort"
        // You'd need to create this customer first or look it up
        name: 'Local Effort Food Co.',
      },
      DocNumber: order.order_number,
      TxnDate: order.order_date.split('T')[0],
      CustomerMemo: {
        value: order.notes || 'Wholesale order from Local Effort',
      },
      BillEmail: {
        Address: 'hello@localeffortfood.com',
      },
      AllowOnlinePayment: false,
      AllowOnlineCreditCardPayment: false,
      AllowOnlineACHPayment: false,
    };

    const qbResponse = await fetch(
      `${QB_API_BASE}/v3/company/${integration.realm_id}/invoice?minorversion=65`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(invoiceData),
      }
    );

    if (!qbResponse.ok) {
      const errorData = await qbResponse.json();
      console.error('[HappyMonday] QuickBooks invoice creation failed:', errorData);
      
      await updateOrderQuickBooksSync(orderId, {
        qb_sync_status: 'error',
        qb_sync_error: JSON.stringify(errorData),
      });

      // Update integration with error
      await supabase
        .from('happymonday_integrations')
        .update({
          last_error: JSON.stringify(errorData),
          updated_at: new Date().toISOString(),
        })
        .eq('provider', 'quickbooks');

      return res.status(500).json({ 
        error: 'Failed to create QuickBooks invoice',
        details: errorData
      });
    }

    const qbInvoice = await qbResponse.json();
    const invoiceId = qbInvoice.Invoice?.Id;

    if (!invoiceId) {
      await updateOrderQuickBooksSync(orderId, {
        qb_sync_status: 'error',
        qb_sync_error: 'QuickBooks invoice ID missing from response',
      });

      return res.status(500).json({
        error: 'QuickBooks invoice ID missing from response',
      });
    }

    // Update order with QuickBooks invoice ID
    await updateOrderQuickBooksSync(orderId, {
      qb_invoice_id: invoiceId,
      qb_sync_status: 'sent',
      qb_synced_at: new Date().toISOString(),
      qb_sync_error: null,
    });

    // Update last sync time
    await supabase
      .from('happymonday_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('provider', 'quickbooks');

    console.log(`[HappyMonday] ✅ QuickBooks invoice created: ${invoiceId} for order ${order.order_number}`);

    return res.status(200).json({
      success: true,
      invoiceId,
      orderNumber: order.order_number,
    });

  } catch (error) {
    console.error('[HappyMonday] QuickBooks invoice error:', error);
    if (supabase && req?.body?.orderId) {
      await updateOrderQuickBooksSync(req.body.orderId, {
        qb_sync_status: 'error',
        qb_sync_error: error.message,
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};
