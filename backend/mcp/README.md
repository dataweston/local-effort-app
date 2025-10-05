# Local Effort MCP Server

This package bootstraps a [Model Context Protocol](https://modelcontextprotocol.io) server so LLM copilots can safely interact with the Local Effort data sources.

## Available tools

### `support.search`
Runs the same hybrid semantic search that powers `/api/support/search`. Returns cached answers when available and falls back to live Supabase queries.

### `sanity.query`
Executes read-only GROQ queries against the Sanity dataset with optional parameters.

## Available resources

- `support-chunk://{chunkId}` – hydrate a single knowledge chunk from Supabase.
- `support-cache://{cacheKey}` – read a cached answer by normalized key.
- `support-source://{sourceId}` – fetch metadata for a support content source.
- `sanity-document://{docId}` – retrieve any Sanity document by `_id`.

## Running the server

```bash
pnpm run mcp:stdio
```

The server expects the same environment variables as the Express API for Supabase, Sanity and optional OpenAI access.

### Streamable HTTP deployment

The production Express API now mounts the MCP server at `https://localeffortfood.com/.well-known/mcp` using the Streamable HTTP transport.
Clients should:

- POST JSON-RPC 2.0 requests to `/.well-known/mcp`
- Open a GET request with `Accept: text/event-stream` to the same path for streamed responses
- Echo any `Mcp-Session-Id` response header in subsequent requests to resume sessions

Metadata for discovery is published at `https://localeffortfood.com/.well-known/mcp.json` and mirrored inside `/public/ai/manifest.json`.
