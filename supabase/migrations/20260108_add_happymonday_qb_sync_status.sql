-- Add QuickBooks sync tracking to Happy Monday orders
ALTER TABLE public.happymonday_orders
  ADD COLUMN IF NOT EXISTS qb_sync_status text DEFAULT 'not_sent'
    CHECK (qb_sync_status IS NULL OR qb_sync_status IN ('not_sent', 'sent', 'error')),
  ADD COLUMN IF NOT EXISTS qb_synced_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qb_sync_error text DEFAULT NULL;
