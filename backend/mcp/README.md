# Local Effort MCP Server

This package bootstraps a [Model Context Protocol](https://modelcontextprotocol.io) server so LLM copilots can safely interact with Local Effort data and commerce flows.

## Available tools

### `support.search`
Runs the same hybrid semantic search that powers `/api/support/search`. Returns cached answers when available and falls back to live Supabase queries.

### `sanity.query`
Executes read-only GROQ queries against the Sanity dataset with optional parameters.

### `ucp.profile`
Returns Local Effort's Universal Commerce Protocol (UCP) business profile and capability metadata.

### `ucp.checkout.create`
Creates a UCP checkout session in the persisted commerce session store.

### `ucp.checkout.get`
Fetches a checkout session by `checkoutSessionId`.

### `ucp.checkout.update`
Updates mutable checkout session fields (line items, buyer, metadata, expiry).

### `ucp.checkout.complete`
Attempts to complete payment for supported flows (`psyche`, `february`, `weekly-order`) and returns escalation details for hosted flows (`small-events`, `local-pizza`).

### `ucp.checkout.cancel`
Cancels a non-completed checkout session.

## Available resources

- `support-chunk://{chunkId}` - hydrate a single knowledge chunk from Supabase.
- `support-cache://{cacheKey}` - read a cached answer by normalized key.
- `support-source://{sourceId}` - fetch metadata for a support content source.
- `sanity-document://{docId}` - retrieve any Sanity document by `_id`.
- `ucp-checkout://{checkoutSessionId}` - load a UCP checkout session snapshot.

## UCP auth requirements

All `ucp.checkout.*` tools require auth and scope checks.

- `ucp.checkout.create` -> `commerce:checkout:create`
- `ucp.checkout.get` -> `commerce:checkout:read`
- `ucp.checkout.update` -> `commerce:checkout:update`
- `ucp.checkout.complete` -> `commerce:checkout:complete`
- `ucp.checkout.cancel` -> `commerce:checkout:cancel`

For Streamable HTTP (`/.well-known/mcp`), auth can be supplied either by:

1. `Authorization: Bearer <token>` mapped via:
- `MCP_AUTH_BEARER_TOKEN` (single token)
- `MCP_AUTH_TOKENS_JSON` (multi-token JSON object/array)

2. Explicit `auth` object in `params.arguments`:
- `actorId` (required)
- `actorType` (optional)
- `sessionId` (optional, defaults from `Mcp-Session-Id` when present)
- `scopes` (required list of scopes)

If `MCP_REQUIRE_BEARER_FOR_UCP=true`, bearer auth is mandatory for `ucp.checkout.*` and `ucp-checkout://...` resource reads.

## MCP request examples

### 1) Create checkout session

```http
POST /.well-known/mcp
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "id": "1",
  "method": "tool.call",
  "params": {
    "name": "ucp.checkout.create",
    "arguments": {
      "flow": "weekly-order",
      "lineItems": [
        {
          "id": "meal-plan-weekly",
          "quantity": 1,
          "item": { "id": "meal-plan-weekly", "title": "Weekly Meals", "unit_price": { "amount": 11900, "currency": "USD" } }
        }
      ],
      "metadata": { "source": "mcp" }
    }
  }
}
```

### 2) Get checkout session

```json
{
  "id": "2",
  "method": "tool.call",
  "params": {
    "name": "ucp.checkout.get",
    "arguments": {
      "checkoutSessionId": "chk_abc123...",
      "auth": {
        "actorId": "assistant-agent",
        "actorType": "agent",
        "sessionId": "mcp-session-123",
        "scopes": ["commerce:checkout:read"]
      }
    }
  }
}
```

### 3) Update checkout session

```json
{
  "id": "3",
  "method": "tool.call",
  "params": {
    "name": "ucp.checkout.update",
    "arguments": {
      "checkoutSessionId": "chk_abc123...",
      "lineItems": [
        {
          "id": "meal-plan-weekly",
          "quantity": 2,
          "item": { "id": "meal-plan-weekly", "title": "Weekly Meals", "unit_price": { "amount": 11900, "currency": "USD" } }
        }
      ],
      "auth": {
        "actorId": "assistant-agent",
        "scopes": ["commerce:checkout:update"]
      }
    }
  }
}
```

### 4) Complete checkout session

```json
{
  "id": "4",
  "method": "tool.call",
  "params": {
    "name": "ucp.checkout.complete",
    "arguments": {
      "checkoutSessionId": "chk_abc123...",
      "idempotencyKey": "pay-try-001",
      "checkoutPayload": {
        "checkoutAttemptId": "chk_abc123...",
        "sourceId": "cnon:card-nonce-ok",
        "amount": 11900
      },
      "auth": {
        "actorId": "assistant-agent",
        "scopes": ["commerce:checkout:complete"]
      }
    }
  }
}
```

### 5) Cancel checkout session

```json
{
  "id": "5",
  "method": "tool.call",
  "params": {
    "name": "ucp.checkout.cancel",
    "arguments": {
      "checkoutSessionId": "chk_abc123...",
      "auth": {
        "actorId": "assistant-agent",
        "scopes": ["commerce:checkout:cancel"]
      }
    }
  }
}
```

### 6) Read checkout resource

```json
{
  "id": "6",
  "method": "resource.get",
  "params": {
    "uri": "ucp-checkout://chk_abc123..."
  }
}
```

## Running the server

```bash
pnpm run mcp:stdio
```

The server expects the same environment variables as the Express API for Supabase, Sanity, Square and optional OpenAI access.

### Streamable HTTP deployment

The production Express API mounts the MCP server at `https://localeffortfood.com/.well-known/mcp` using Streamable HTTP transport.
Clients should:

- POST JSON-RPC 2.0 requests to `/.well-known/mcp`
- Open a GET request with `Accept: text/event-stream` to the same path for streamed responses
- Echo any `Mcp-Session-Id` response header in subsequent requests to resume sessions

Metadata for discovery is published at `https://localeffortfood.com/.well-known/mcp.json` and mirrored inside `/public/ai/manifest.json`.

## UCP session persistence

Checkout sessions are now persisted beyond process restarts:

- Primary store: Postgres via Prisma table `ucp_checkout_sessions`
- In-memory cache: retained for hot access
- Expiration: each session has `expires_at`
- Cleanup: expired rows are purged on a retention schedule

If Prisma/Postgres is unavailable, UCP falls back to in-memory sessions and logs a warning.
