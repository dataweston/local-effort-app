## What changes and why

## Verification

## Done checklist

- [ ] Changed surface loaded and viewed (page/admin/email), not just built or unit-tested
- [ ] Searched the repo for every old value/phrase/date; no stale consumer remains (or listed below)
- [ ] CMS-owned copy/dates are read from the CMS, not hard-coded or forced over CMS values; `pnpm check:content` passes
- [ ] Sales change: admin/owner counterpart and customer-facing messages reviewed (wording, address, time + timezone, delivery vs pickup, contact preferences)
- [ ] One outcome in this change; commit message says what changed
- Known gaps / unverified items:

## Sales confirmation requirement

For any sales/checkout/payment change (otherwise state not applicable):
- Customer Brevo confirmation implementation:
- Owner Brevo notification implementation:
- Durable job keys, retry and duplicate protection:
- Verified-payment trigger; failed/cancelled payment behavior:
- Owner-only test send to yum@localeffortfood.com and delivery evidence:

Missing or unverified confirmation is a release blocker for every sales module, without exception. See AGENTS.md.
