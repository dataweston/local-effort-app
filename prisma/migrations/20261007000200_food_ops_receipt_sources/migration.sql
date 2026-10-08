-- Retail register receipts (Wedge, Eastside) are a distinct, indicative-price
-- observation source. Widens the allowed set only; no data changes.
ALTER TABLE "CostObservation" DROP CONSTRAINT "CostObservation_source_check";
ALTER TABLE "CostObservation"
  ADD CONSTRAINT "CostObservation_source_check"
  CHECK ("source" IN ('manual', 'lb_line', 'receipt_wedge', 'receipt_eastside'));
