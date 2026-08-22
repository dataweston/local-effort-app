WITH processor_accounts AS (
  SELECT id
  FROM financial_accounts
  WHERE "squareConnectionId" IS NOT NULL
),
lines AS (
  SELECT
    to_char(date_trunc('month', t.date), 'YYYY-MM') AS month,
    t.id AS transaction_id,
    t.type::text AS transaction_type,
    ABS(COALESCE(s.amount, t.amount))::numeric AS amount,
    COALESCE(sc.name, c.name, '') AS category_name,
    COALESCE(t."merchantName", '') AS merchant_name,
    COALESCE(t.description, '') AS description,
    COALESCE(
      s.classification::text,
      sc."defaultClassification"::text,
      t.classification::text,
      c."defaultClassification"::text
    ) AS classification
  FROM transactions t
  LEFT JOIN transaction_splits s ON s."transactionId" = t.id
  LEFT JOIN categories sc ON sc.id = s."categoryId"
  LEFT JOIN categories c ON c.id = t."categoryId"
  WHERE t.status::text = 'POSTED'
    AND t.date >= DATE '2025-02-01'
    AND t.date < DATE '2026-08-01'
    AND t."accountId" NOT IN (SELECT id FROM processor_accounts)
),
tagged AS (
  SELECT
    *,
    category_name ~* '(^|\\m)(labor|payroll|wages?|contractors?|staff)(\\M|$)'
      OR (merchant_name || ' ' || description) ~* '(square|block)[ -]*payroll' AS is_labor,
    (category_name || ' ' || merchant_name || ' ' || description) ~* '(debt|loan|capital repayment)' AS is_debt
  FROM lines
)
SELECT
  month,
  ROUND(COALESCE(SUM(amount) FILTER (WHERE classification = 'INCOME' AND transaction_type = 'INCOME'), 0), 2) AS gross_revenue,
  ROUND(COALESCE(SUM(amount) FILTER (WHERE classification = 'INCOME' AND transaction_type = 'EXPENSE'), 0), 2) AS refunds,
  ROUND(COALESCE(SUM(amount) FILTER (WHERE classification = 'COGS' AND NOT is_labor), 0), 2) AS inventory_purchases,
  ROUND(COALESCE(SUM(amount) FILTER (WHERE is_labor), 0), 2) AS paid_labor,
  ROUND(COALESCE(SUM(amount) FILTER (WHERE classification = 'OPERATING' AND NOT is_labor), 0), 2) AS operating_including_debt,
  ROUND(COALESCE(SUM(amount) FILTER (WHERE classification IS NULL AND transaction_type = 'EXPENSE' AND NOT is_labor), 0), 2) AS unclassified_outflow,
  ROUND(COALESCE(SUM(amount) FILTER (WHERE classification = 'PERSONAL' AND transaction_type = 'EXPENSE'), 0), 2) AS founder_draws,
  ROUND(COALESCE(SUM(amount) FILTER (WHERE classification = 'OPERATING' AND NOT is_labor AND is_debt), 0), 2) AS observed_debt_service
FROM tagged
GROUP BY month
ORDER BY month;
