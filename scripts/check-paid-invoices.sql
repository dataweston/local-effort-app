-- Check which invoices are closed/paid and how they were created

WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
)
SELECT
  '📋 PAID/CLOSED INVOICES BREAKDOWN' as "═══════════════════",
  o.order_number,
  o.order_date,
  o.status,
  o.total_cents / 100.0 as amount_dollars,
  CASE 
    WHEN o.created_by = (SELECT id FROM client) THEN 'CLIENT-authored'
    ELSE 'ADMIN-authored'
  END as who_created,
  creator.email as created_by_email,
  -- Check if there's a payment record for this order
  (
    SELECT COUNT(*) 
    FROM happymonday_payments p 
    WHERE p.order_id = o.id
  ) as has_payment_record,
  (
    SELECT SUM(amount_cents) / 100.0
    FROM happymonday_payments p 
    WHERE p.order_id = o.id
  ) as payment_applied_dollars,
  o.created_at
FROM happymonday_orders o
JOIN happymonday_users u ON o.user_id = u.id
LEFT JOIN happymonday_users creator ON o.created_by = creator.id
WHERE u.email = 'hello@happymonday.company'
AND o.status IN ('paid', 'refunded')
ORDER BY o.order_date;

-- Summary
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
)
SELECT
  '📊 SUMMARY' as "═══════════════════",
  SUM(total_cents) / 100.0 as total_paid_invoices_dollars,
  SUM(CASE WHEN created_by = (SELECT id FROM client) THEN total_cents ELSE 0 END) / 100.0 as client_created_paid_dollars,
  SUM(CASE WHEN created_by != (SELECT id FROM client) THEN total_cents ELSE 0 END) / 100.0 as admin_created_paid_dollars,
  COUNT(*) as total_paid_count,
  (SELECT SUM(amount_cents) / 100.0 FROM happymonday_payments WHERE user_id = (SELECT id FROM client)) as total_payments_applied
FROM happymonday_orders
WHERE user_id = (SELECT id FROM client)
AND status IN ('paid', 'refunded');
