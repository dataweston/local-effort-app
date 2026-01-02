-- Happy Monday Integrations Schema
-- Adds support for QuickBooks and Square integrations

-- Table: happymonday_integrations
-- Stores OAuth tokens for QuickBooks and Square connections
CREATE TABLE IF NOT EXISTS public.happymonday_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('quickbooks', 'square')),
  -- OAuth tokens (encrypted at rest by Supabase)
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  -- Provider-specific IDs
  realm_id text,              -- QuickBooks company ID
  merchant_id text,           -- Square merchant ID
  location_id text,           -- Square location ID
  -- Scopes and metadata
  scopes text[],
  metadata jsonb DEFAULT '{}',
  -- Status
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  last_error text,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Only one active connection per provider
  UNIQUE(provider)
);

-- Table: happymonday_item_catalog_mapping
-- Maps Local Effort items to Happy Monday's Square catalog items
CREATE TABLE IF NOT EXISTS public.happymonday_item_catalog_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_item_id integer NOT NULL,           -- Local Effort item ID (1-19)
  local_item_name text NOT NULL,            -- For reference
  -- Square catalog mapping
  square_catalog_object_id text,            -- Happy Monday's Square catalog object ID
  square_catalog_variation_id text,         -- Variation ID if applicable
  -- QuickBooks mapping (optional)
  qb_item_id text,                          -- QuickBooks item ID
  qb_item_name text,                        -- QuickBooks item name
  -- Tracking
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(local_item_id)
);

-- Table: happymonday_inventory_syncs
-- Logs inventory sync operations
CREATE TABLE IF NOT EXISTS public.happymonday_inventory_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.happymonday_orders(id) ON DELETE SET NULL,
  triggered_by uuid REFERENCES public.happymonday_users(id) ON DELETE SET NULL,
  -- Sync details
  items_synced jsonb NOT NULL DEFAULT '{}',  -- {local_item_id: quantity}
  items_skipped jsonb DEFAULT '[]',          -- [{item_id, reason}]
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'partial', 'failed')),
  error_message text,
  square_response jsonb,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Add columns to happymonday_orders for tracking sync status
ALTER TABLE public.happymonday_orders 
  ADD COLUMN IF NOT EXISTS inventory_sync_status text DEFAULT NULL 
    CHECK (inventory_sync_status IS NULL OR inventory_sync_status IN ('pending', 'synced', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS inventory_synced_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qb_invoice_id text DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_happymonday_integrations_provider ON public.happymonday_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_happymonday_item_catalog_mapping_local_item_id ON public.happymonday_item_catalog_mapping(local_item_id);
CREATE INDEX IF NOT EXISTS idx_happymonday_inventory_syncs_order_id ON public.happymonday_inventory_syncs(order_id);
CREATE INDEX IF NOT EXISTS idx_happymonday_inventory_syncs_status ON public.happymonday_inventory_syncs(status);

-- RLS Policies
ALTER TABLE public.happymonday_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happymonday_item_catalog_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happymonday_inventory_syncs ENABLE ROW LEVEL SECURITY;

-- Integrations: Only admins can view/manage
CREATE POLICY "Admins can view integrations"
  ON public.happymonday_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage integrations"
  ON public.happymonday_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

-- Item catalog mapping: All authenticated users can view, admins can modify
CREATE POLICY "Users can view catalog mappings"
  ON public.happymonday_item_catalog_mapping FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can manage catalog mappings"
  ON public.happymonday_item_catalog_mapping FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

-- Inventory syncs: All users can view, admins can create
CREATE POLICY "Users can view inventory syncs"
  ON public.happymonday_inventory_syncs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can create inventory syncs"
  ON public.happymonday_inventory_syncs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON public.happymonday_integrations TO authenticated;
GRANT ALL ON public.happymonday_item_catalog_mapping TO authenticated;
GRANT ALL ON public.happymonday_inventory_syncs TO authenticated;

-- Comments
COMMENT ON TABLE public.happymonday_integrations IS 'OAuth tokens for QuickBooks and Square integrations';
COMMENT ON TABLE public.happymonday_item_catalog_mapping IS 'Maps Local Effort items to Happy Monday Square catalog items';
COMMENT ON TABLE public.happymonday_inventory_syncs IS 'Logs of inventory sync operations to Square';
