/**
 * Square Catalog Items Endpoint
 * Fetches Happy Monday's Square catalog items for mapping
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
  
  // Refresh if token expires in less than 1 day
  if (expiresAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
    return await refreshSquareToken(integration);
  }
  
  return integration.access_token;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
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

    // Get valid access token
    const accessToken = await getValidAccessToken(integration);

    // Create Square client with Happy Monday's token
    const env = SQ_ENVIRONMENT === 'sandbox' ? Environment.Sandbox : Environment.Production;
    const squareClient = new Client({
      accessToken,
      environment: env,
    });

    // Fetch catalog items
    const catalogResponse = await squareClient.catalogApi.listCatalog(undefined, 'ITEM');
    const items = catalogResponse.result.objects || [];

    // Format items for frontend
    const formattedItems = items.map(item => {
      const variations = (item.itemData?.variations || []).map(v => ({
        id: v.id,
        name: v.itemVariationData?.name || 'Default',
        sku: v.itemVariationData?.sku,
        priceCents: v.itemVariationData?.priceMoney?.amount,
      }));

      return {
        id: item.id,
        name: item.itemData?.name || 'Unknown',
        description: item.itemData?.description,
        category: item.itemData?.categoryId,
        variations,
      };
    });

    console.log(`[HappyMonday] Fetched ${formattedItems.length} Square catalog items`);

    return res.status(200).json({
      success: true,
      items: formattedItems,
      locationId: integration.location_id,
    });

  } catch (error) {
    console.error('[HappyMonday] Square catalog fetch error:', error);
    
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
