# Levy Family Weekly Order Setup

This checklist configures the shared Levy family profile (Dave + Allison) with a plan price of $257 + $10 delivery and section rules.

## 1) Create Supabase auth users
- Add both emails in Supabase Auth:
  - davelevy3@gmail.com
  - allisonlevy627@gmail.com

## 2) Create customer + link users in Prisma
Run:

```bash
pnpm weekly-order:customer-setup -- --slug levy-family --name "Levy Family" --emails davelevy3@gmail.com,allisonlevy627@gmail.com --week 2026-02-03 --plan-base 25700 --plan-delivery 1000 --rules-file docs/weekly-order-levy-rules.json
```

Notes:
- Update the `--week` date to the active menu week start date.
- The rules file encodes the 3 Family Dinners + 3-5 Kids Food requirements.

## 3) Build the custom menu view in Admin
Go to `/admin/weekly-order`:

Menu Weeks tab:
1. Create sections for the active week:
   - Family Dinners (slug: family-dinners)
   - Kids Food (slug: kids-food)
   - Add-ons (slug: add-ons)
2. Assign dishes to the appropriate section.
3. Toggle "Included" for Family Dinners and Kids Food items.
4. Toggle "Add-on" for Add-ons items.

Pricing tab:
- Set per-tier prices for Add-ons and any a la carte items.

Plans tab:
- Confirm the Levy Family plan row shows Base 25700 and Delivery 1000.
- Adjust plan rules JSON if needed.

Overrides tab:
- Add per-user overrides (Dave vs Allison) when custom pricing is required.

## 4) Assign the customer slug to the weekly order page
- Share `/weekly-order/levy-family` with the family.

