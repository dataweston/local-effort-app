-- Wholesale/direct vendor invoices and order confirmations (Gmail) are a distinct
-- observation source. Vendor identity stays on VendorItem. Widens the allowed set only.
ALTER TABLE "CostObservation" DROP CONSTRAINT "CostObservation_source_check";
ALTER TABLE "CostObservation"
  ADD CONSTRAINT "CostObservation_source_check"
  CHECK ("source" IN ('manual', 'lb_line', 'receipt_wedge', 'receipt_eastside', 'vendor_invoice'));
