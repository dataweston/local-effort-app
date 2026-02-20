/**
 * Sync Inventory to Square Endpoint
 * Manually triggers inventory sync to Happy Monday's Square POS
 * INCREASES their inventory when they purchase from Local Effort
 */

const { Client, Environment } = require('square');

const SQ_ENVIRONMENT = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();

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

async function refreshSquareToken(integration) {
  const SQ_APP_ID = process.env.SQUARE_APP_ID || process.env.VITE_SQUARE_APP_ID;
  const SQ_APP_SECRET = process.env.SQUARE_APP_SECRET;
  
  const env = SQ_ENVIRONMENT === 'sandbox' ? Environment.Sandbox : Environment.Production;
  const squareClient = new Client({ environment: env });

  const response = await squareClient.oAuthApi.obtainToken({
    clientId: SQ_APP_ID,
    clientSecret: SQ_APP_SECRET,
    refreshToken: integration.refresh_token,
    grantType: 'refresh_token',
  });

  const result = response.result;
  const expiresAt = result.expiresAt
    ? new Date(result.expiresAt)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from('happymonday_integrations')
    .update({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider', 'square');

  return result.accessToken;
}

async function getValidAccessToken(integration) {
  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
    return await refreshSquareToken(integration);
  }
  
  return integration.access_token;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    const { orderId, triggeredBy } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Get Square integration
    const { data: integration, error: integrationError } = await supabase
      .from('happymonday_integrations')
      .select('*')
      .eq('provider', 'square')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return res.status(400).json({
        error: 'Square not connected',
        message: 'Please connect Square in the Settings tab first'
      });
    }

    if (!integration.location_id) {
      return res.status(400).json({
        error: 'Square location not set',
        message: 'No active Square location found. Please reconnect Square.'
      });
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

    // Check if already synced
    if (order.inventory_sync_status === 'synced') {
      return res.status(400).json({
        error: 'Already synced',
        message: 'This order has already been synced to Square inventory'
      });
    }

    // Get catalog mappings
    const { data: mappings, error: mappingError } = await supabase
      .from('happymonday_item_catalog_mapping')
      .select('*')
      .eq('is_active', true);

    if (mappingError) {
      console.error('[HappyMonday] Error fetching catalog mappings:', mappingError);
    }

    const mappingMap = new Map((mappings || []).map(m => [m.local_item_id, m]));

    // Get valid access token
    const accessToken = await getValidAccessToken(integration);

    // Create Square client with Happy Monday's token
    const env = SQ_ENVIRONMENT === 'sandbox' ? Environment.Sandbox : Environment.Production;
    const squareClient = new Client({
      accessToken,
      environment: env,
    });

    // Build inventory adjustments
    const changes = [];
    const itemsSynced = {};
    const itemsSkipped = [];

    for (const [itemId, quantity] of Object.entries(order.items)) {
      const localItemId = parseInt(itemId);
      const mapping = mappingMap.get(localItemId);
      const menuItem = MENU_ITEMS.find(m => m.id === localItemId);

      if (!mapping || !mapping.square_catalog_object_id) {
        itemsSkipped.push({
          item_id: localItemId,
          item_name: menuItem?.name || `Item ${localItemId}`,
          reason: 'No Square catalog mapping configured',
        });
        continue;
      }

      // Skip negative quantities (credits/returns)
      if (quantity <= 0) {
        itemsSkipped.push({
          item_id: localItemId,
          item_name: menuItem?.name || `Item ${localItemId}`,
          reason: 'Negative quantity (credit/return)',
        });
        continue;
      }

      // Use variation ID if available, otherwise use catalog object ID
      const catalogObjectId = mapping.square_catalog_variation_id || mapping.square_catalog_object_id;

      changes.push({
        type: 'ADJUSTMENT',
        adjustment: {
          catalogObjectId,
          locationId: integration.location_id,
          fromState: 'NONE',      // Coming from external source
          toState: 'IN_STOCK',    // Adding to inventory
          quantity: String(quantity),
          occurredAt: new Date().toISOString(),
          referenceId: order.order_number,
        },
      });

      itemsSynced[localItemId] = quantity;
    }

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('happymonday_inventory_syncs')
      .insert({
        order_id: orderId,
        triggered_by: triggeredBy || null,
        items_synced: itemsSynced,
        items_skipped: itemsSkipped,
        status: 'pending',
      })
      .select()
      .single();

    if (changes.length === 0) {
      // No items to sync - update status
      await supabase
        .from('happymonday_inventory_syncs')
        .update({
          status: 'failed',
          error_message: 'No items with valid catalog mappings',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog?.id);

      await supabase
        .from('happymonday_orders')
        .update({
          inventory_sync_status: 'skipped',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return res.status(400).json({
        error: 'No items to sync',
        message: 'No items have valid Square catalog mappings. Please configure mappings in Settings.',
        itemsSkipped,
      });
    }

    // Execute batch inventory adjustment
    const crypto = require('crypto');
    const idempotencyKey = `inv-sync-${orderId}-${crypto.randomBytes(4).toString('hex')}`;

    const inventoryResponse = await squareClient.inventoryApi.batchChangeInventory({
      idempotencyKey,
      changes,
    });

    const result = inventoryResponse.result;

    // Update sync log with success
    await supabase
      .from('happymonday_inventory_syncs')
      .update({
        status: itemsSkipped.length > 0 ? 'partial' : 'success',
        square_response: result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLog?.id);

    // Update order with sync status
    await supabase
      .from('happymonday_orders')
      .update({
        inventory_sync_status: 'synced',
        inventory_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Update integration last sync time
    await supabase
      .from('happymonday_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('provider', 'square');

    console.log(`[HappyMonday] ✅ Inventory synced for order ${order.order_number}: ${Object.keys(itemsSynced).length} items`);

    return res.status(200).json({
      success: true,
      orderNumber: order.order_number,
      itemsSynced,
      itemsSkipped,
      changesApplied: changes.length,
    });

  } catch (error) {
    console.error('[HappyMonday] Inventory sync error:', error);

    // Update integration with error
    if (supabase) {
      await supabase
        .from('happymonday_integrations')
        .update({
          last_error: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq('provider', 'square');
    }

    return res.status(500).json({ error: error.message });
  }
};
