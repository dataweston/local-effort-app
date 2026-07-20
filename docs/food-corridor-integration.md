# Food Corridor / Neon integration

As of 2026-07-19, Food Corridor has an active Local Effort account connected to NEON Collective Kitchens, but no public developer API or webhook documentation was found in Food Corridor's official help center.

## Current supported ingestion

Use Gmail notifications from `hello@thefoodcorridor.com` as source-backed booking evidence:

- accept only booking-approved and booking-change-approved messages;
- identify a booking by the `View Booking` target when available;
- treat the latest approved change for that booking/date/resource as authoritative;
- retain resource, local date, start/end time, Gmail message/thread ID, and received timestamp;
- ignore request-only, denied, canceled, and superseded approval messages;
- calculate monthly hours after deduplication, then apply NEON's documented tier.

July evidence already proves more than 20 approved hours by July 7, 2026: July 1 (4h), July 2 (4h across three approved bookings), July 5 (6h), July 6 final approved time (6h), and July 7 final approved time (3h), totaling 23 hours. Therefore July 20, 24, and 25 use the $35/hour over-20-hours rate.

## Preferred future integration

Ask Food Corridor support for an official tenant API, webhook, calendar feed, or supported export covering:

- bookings and stable booking IDs;
- approval/change/cancel state;
- resource and kitchen;
- local start/end and timezone;
- price, fees, invoice/bill ID, and payment state;
- pagination, rate limits, and webhook signature verification.

Do not reverse-engineer private browser endpoints. Until official access is issued, Gmail ingestion is the supported automated fallback and the Food Corridor portal remains the final source for disputes.
