WITH operating_transactions AS (
  SELECT
    t.id,
    t.date AS effective_at,
    t.amount,
    t.type,
    t.classification,
    t.description,
    t."merchantName" AS merchant_name,
    t."categoryId" AS category_id,
    c.name AS category_name,
    c."defaultClassification" AS category_default_classification,
    t."accountId" AS account_id,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'amount', ts.amount,
        'classification', ts.classification,
        'categoryId', ts."categoryId",
        'categoryName', sc.name,
        'categoryDefaultClassification', sc."defaultClassification"
      ) ORDER BY ts.id)
      FROM transaction_splits ts
      LEFT JOIN categories sc ON sc.id = ts."categoryId"
      WHERE ts."transactionId" = t.id
    ), '[]'::jsonb) AS splits
  FROM transactions t
  LEFT JOIN categories c ON c.id = t."categoryId"
  WHERE t.status = 'POSTED'
    AND t.date >= DATE '2025-02-01'
    AND t.date < DATE '2026-08-01'
    AND NOT EXISTS (
      SELECT 1
      FROM reconciliation_allocations ra
      WHERE ra."transactionId" = t.id
        AND ra."isCurrent" = TRUE
        AND ra.role = 'BANK_SETTLEMENT'
    )
),
current_settlement_entries AS (
  SELECT
    pse.id,
    COALESCE(pse."effectiveAt", ps."effectiveAt") AS effective_at,
    pse.type,
    pse."grossAmount" AS gross_amount,
    pse."feeAmount" AS fee_amount,
    pse."netAmount" AS net_amount,
    ps."reconciliationStatus" AS reconciliation_status
  FROM processor_settlement_entries pse
  JOIN processor_settlements ps ON ps.id = pse."settlementId"
  WHERE pse."isCurrent" = TRUE
    AND ps."effectiveAt" >= DATE '2025-02-01'
    AND ps."effectiveAt" < DATE '2026-08-01'
),
current_business_cash AS (
  SELECT
    fa.id,
    fa.name,
    fa."currentBalance" AS current_balance,
    fa."availableBalance" AS available_balance,
    fa."lastSyncedAt" AS last_synced_at
  FROM financial_accounts fa
  WHERE fa."isActive" = TRUE
    AND LOWER(fa.name) = 'local pizza'
)
SELECT 'transaction' AS record_type, to_jsonb(operating_transactions) AS record
FROM operating_transactions
UNION ALL
SELECT 'settlement_entry' AS record_type, to_jsonb(current_settlement_entries) AS record
FROM current_settlement_entries
UNION ALL
SELECT 'business_cash' AS record_type, to_jsonb(current_business_cash) AS record
FROM current_business_cash;
