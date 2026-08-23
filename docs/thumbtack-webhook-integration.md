# Thumbtack webhook integration

Local Effort receives Thumbtack lead, message, and review events at:

```text
POST https://www.localeffortfood.com/api/webhooks/thumbtack
```

The receiver uses Thumbtack's supported HTTP Basic authentication and writes accepted events to the private Company Brain ledger. Deliveries are idempotent by Thumbtack object ID.

## Required server configuration

Set these secrets in the production environment. Do not commit their values.

```text
THUMBTACK_WEBHOOK_USERNAME
THUMBTACK_WEBHOOK_PASSWORD
```

The endpoint returns `503 webhook-not-configured` until both values exist.

## Thumbtack setup

In [Thumbtack webhook settings](https://thumbtack.com/pro/webhooks/list), create a webhook with:

- URL: `https://www.localeffortfood.com/api/webhooks/thumbtack`
- Authentication: HTTP Basic
- Username and password: the exact values configured above
- Event types: leads (`NegotiationCreatedV4`), messages (`MessageCreatedV4`), and reviews (`ReviewCreatedV4`)

Keep the webhook paused until the production deployment and credentials are ready. Send a test event before enabling it for live traffic.

## Current scope

This is one-way ingestion. It receives new events moving forward; it does not grant REST API access, import historical leads, fetch arbitrary account data, or send Thumbtack messages. Those capabilities require a Thumbtack Partner Platform OAuth2 integration and approved credentials.

Official references:

- [Manage Webhooks in Thumbtack](https://developers.thumbtack.com/docs/pro-integrations/self-serve-webhooks)
- [Pro Profiles and webhook authentication](https://developers.thumbtack.com/docs/pro-integrations/businesses#webhooks)
- [Thumbtack Partner Platform overview](https://developers.thumbtack.com/docs/overview)
