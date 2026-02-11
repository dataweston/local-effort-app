const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const { searchSupport, normalizeKey } = require('../api/utils/supportSearchService');
const { getSupabase } = require('../api/supabaseClient');
const { getSanityClient } = require('../api/sanityClient');
const {
  buildBusinessProfile,
  createCheckoutSession,
  getCheckoutSession,
  updateCheckoutSession,
  completeCheckoutSession,
  cancelCheckoutSession,
} = require('../api/routes/ucp');

const mcpAuthSchema = z.object({
  actorId: z.string().min(1, 'auth.actorId is required'),
  actorType: z.string().optional(),
  sessionId: z.string().optional(),
  scopes: z.array(z.string().min(1)).min(1, 'auth.scopes must include at least one scope'),
});

function registerSupportResources(server) {
  const chunkTemplate = new ResourceTemplate('support-chunk://{chunkId}', { list: undefined });
  server.registerResource(
    'support.chunk',
    chunkTemplate,
    {
      title: 'Support knowledge chunk',
      description: 'Fetch a single chunk from the Supabase knowledge base.',
      mimeType: 'text/markdown',
    },
    async (uri, { chunkId }) => {
      const supabase = getSupabase();
      if (!supabase) throw new Error('supabase-not-configured');
      const { data, error } = await supabase
        .from('content_chunks')
        .select('id, source_id, ord, heading, anchor, text, updated_at')
        .eq('id', chunkId)
        .maybeSingle();
      if (error) throw new Error(`supabase-error: ${error.message || error}`);
      if (!data) throw new Error('support-chunk-not-found');

      const textLines = [];
      if (data.heading) textLines.push(`# ${data.heading}`);
      textLines.push(data.text);

      return {
        contents: [
          {
            uri: uri.href,
            text: textLines.join('\n\n'),
          },
          {
            uri: `${uri.href}#metadata`,
            json: {
              id: data.id,
              sourceId: data.source_id,
              ord: data.ord,
              heading: data.heading,
              anchor: data.anchor,
              updatedAt: data.updated_at,
            },
          },
        ],
      };
    }
  );

  const cacheTemplate = new ResourceTemplate('support-cache://{cacheKey}', { list: undefined });
  server.registerResource(
    'support.cache-entry',
    cacheTemplate,
    {
      title: 'Cached support answer',
      description: 'Look up a cached support answer by normalized cache key.',
      mimeType: 'application/json',
    },
    async (uri, { cacheKey }) => {
      const supabase = getSupabase();
      if (!supabase) throw new Error('supabase-not-configured');
      const normalized = normalizeKey(cacheKey);
      const { data, error } = await supabase
        .from('cached_answers')
        .select('*')
        .eq('cache_key', normalized)
        .maybeSingle();
      if (error) throw new Error(`supabase-error: ${error.message || error}`);
      if (!data) throw new Error('support-cache-miss');
      return {
        contents: [
          {
            uri: uri.href,
            json: data,
          },
        ],
      };
    }
  );

  const sourceTemplate = new ResourceTemplate('support-source://{sourceId}', { list: undefined });
  server.registerResource(
    'support.source',
    sourceTemplate,
    {
      title: 'Support source document',
      description: 'Retrieve metadata for a content source backing the support knowledge base.',
      mimeType: 'application/json',
    },
    async (uri, { sourceId }) => {
      const supabase = getSupabase();
      if (!supabase) throw new Error('supabase-not-configured');
      const { data, error } = await supabase
        .from('content_sources')
        .select('id, type, source_id, url, title, tags, published, updated_at')
        .eq('id', sourceId)
        .maybeSingle();
      if (error) throw new Error(`supabase-error: ${error.message || error}`);
      if (!data) throw new Error('support-source-not-found');
      return {
        contents: [
          {
            uri: uri.href,
            json: data,
          },
        ],
      };
    }
  );
}

function registerSupportTools(server) {
  server.registerTool(
    'support.search',
    {
      title: 'Search support knowledge base',
      description: 'Hybrid semantic + keyword search over Supabase support chunks.',
      inputSchema: z.object({
        query: z.string().min(1, 'query is required'),
        skipCache: z.boolean().optional(),
      }),
    },
    async ({ query, skipCache }) => {
      const payload = await searchSupport(query, { useCache: !skipCache });
      return {
        content: [
          {
            type: 'json',
            json: payload,
          },
        ],
      };
    }
  );
}

function registerSanityResources(server) {
  const docTemplate = new ResourceTemplate('sanity-document://{docId}', { list: undefined });
  server.registerResource(
    'sanity.document',
    docTemplate,
    {
      title: 'Sanity document',
      description: 'Load a raw Sanity document by ID.',
      mimeType: 'application/json',
    },
    async (uri, { docId }) => {
      const sanity = getSanityClient();
      if (!sanity) throw new Error('sanity-not-configured');
      const doc = await sanity.getDocument(docId);
      if (!doc) throw new Error('sanity-document-not-found');
      return {
        contents: [
          {
            uri: uri.href,
            json: doc,
          },
        ],
      };
    }
  );
}

function registerSanityTools(server) {
  server.registerTool(
    'sanity.query',
    {
      title: 'Run a GROQ query against Sanity',
      description: 'Execute a read-only GROQ query with optional parameters.',
      inputSchema: z.object({
        query: z.string().min(1, 'query is required'),
        params: z.record(z.any()).optional(),
      }),
    },
    async ({ query, params }) => {
      const sanity = getSanityClient();
      if (!sanity) throw new Error('sanity-not-configured');
      const data = await sanity.fetch(query, params);
      return {
        content: [
          {
            type: 'json',
            json: { data },
          },
        ],
      };
    }
  );
}

function registerUcpResources(server) {
  const checkoutTemplate = new ResourceTemplate('ucp-checkout://{checkoutSessionId}', { list: undefined });
  server.registerResource(
    'ucp.checkout-session',
    checkoutTemplate,
    {
      title: 'UCP checkout session',
      description: 'Load a UCP checkout session by checkoutSessionId.',
      mimeType: 'application/json',
    },
    async (uri, { checkoutSessionId }, context = {}) => {
      const result = await getCheckoutSession(checkoutSessionId, {
        auth: context.auth,
        requireAuth: Boolean(context.requireAuth),
      });
      if (result.statusCode >= 400) {
        throw new Error(result.body?.error || 'ucp-checkout-not-found');
      }
      return {
        contents: [
          {
            uri: uri.href,
            json: result.body,
          },
        ],
      };
    }
  );
}

function registerUcpTools(server) {
  server.registerTool(
    'ucp.profile',
    {
      title: 'Get UCP business profile',
      description: 'Return Local Effort UCP capability/profile metadata.',
      inputSchema: z.object({
        siteUrl: z.string().url().optional(),
      }),
    },
    async ({ siteUrl }) => {
      const profile = buildBusinessProfile(siteUrl);
      return {
        content: [
          {
            type: 'json',
            json: profile,
          },
        ],
      };
    }
  );

  server.registerTool(
    'ucp.checkout.create',
    {
      title: 'Create checkout session',
      description: 'Create a UCP checkout session for Local Effort product flows.',
      inputSchema: z.object({
        auth: mcpAuthSchema,
        flow: z.string().optional(),
        lineItems: z.array(z.any()).optional(),
        buyer: z.record(z.any()).optional(),
        metadata: z.record(z.any()).optional(),
        expiresAt: z.string().optional(),
      }),
    },
    async ({ auth, flow, lineItems, buyer, metadata, expiresAt }) => {
      const result = await createCheckoutSession({
        flow,
        line_items: lineItems || [],
        buyer,
        metadata,
        expires_at: expiresAt,
      }, {
        platformAgent: 'mcp-tool',
        auth,
        requireAuth: true,
      });
      return {
        content: [
          {
            type: 'json',
            json: { statusCode: result.statusCode, body: result.body },
          },
        ],
      };
    }
  );

  server.registerTool(
    'ucp.checkout.get',
    {
      title: 'Get checkout session',
      description: 'Retrieve a UCP checkout session by ID.',
      inputSchema: z.object({
        auth: mcpAuthSchema,
        checkoutSessionId: z.string().min(1, 'checkoutSessionId is required'),
      }),
    },
    async ({ auth, checkoutSessionId }) => {
      const result = await getCheckoutSession(checkoutSessionId, {
        auth,
        requireAuth: true,
      });
      return {
        content: [
          {
            type: 'json',
            json: { statusCode: result.statusCode, body: result.body },
          },
        ],
      };
    }
  );

  server.registerTool(
    'ucp.checkout.update',
    {
      title: 'Update checkout session',
      description: 'Update mutable fields on a UCP checkout session.',
      inputSchema: z.object({
        auth: mcpAuthSchema,
        checkoutSessionId: z.string().min(1, 'checkoutSessionId is required'),
        lineItems: z.array(z.any()).optional(),
        buyer: z.record(z.any()).optional(),
        metadata: z.record(z.any()).optional(),
        expiresAt: z.string().optional(),
      }),
    },
    async ({ auth, checkoutSessionId, lineItems, buyer, metadata, expiresAt }) => {
      const result = await updateCheckoutSession(checkoutSessionId, {
        line_items: lineItems,
        buyer,
        metadata,
        expires_at: expiresAt,
      }, {
        auth,
        requireAuth: true,
      });
      return {
        content: [
          {
            type: 'json',
            json: { statusCode: result.statusCode, body: result.body },
          },
        ],
      };
    }
  );

  server.registerTool(
    'ucp.checkout.complete',
    {
      title: 'Complete checkout session',
      description: 'Attempt to complete payment for a UCP checkout session.',
      inputSchema: z.object({
        auth: mcpAuthSchema,
        checkoutSessionId: z.string().min(1, 'checkoutSessionId is required'),
        checkoutPayload: z.record(z.any()).optional(),
        idempotencyKey: z.string().optional(),
      }),
    },
    async ({ auth, checkoutSessionId, checkoutPayload, idempotencyKey }) => {
      const result = await completeCheckoutSession(
        checkoutSessionId,
        { checkout_payload: checkoutPayload },
        {
          idempotencyKey,
          logger: console,
          auth,
          requireAuth: true,
        }
      );
      return {
        content: [
          {
            type: 'json',
            json: { statusCode: result.statusCode, body: result.body },
          },
        ],
      };
    }
  );

  server.registerTool(
    'ucp.checkout.cancel',
    {
      title: 'Cancel checkout session',
      description: 'Cancel an incomplete UCP checkout session.',
      inputSchema: z.object({
        auth: mcpAuthSchema,
        checkoutSessionId: z.string().min(1, 'checkoutSessionId is required'),
      }),
    },
    async ({ auth, checkoutSessionId }) => {
      const result = await cancelCheckoutSession(checkoutSessionId, {
        auth,
        requireAuth: true,
      });
      return {
        content: [
          {
            type: 'json',
            json: { statusCode: result.statusCode, body: result.body },
          },
        ],
      };
    }
  );
}

function createMcpServer({ name = 'local-effort-mcp', version = '0.1.0' } = {}) {
  const server = new McpServer({ name, version });
  registerSupportResources(server);
  registerSupportTools(server);
  registerSanityResources(server);
  registerSanityTools(server);
  registerUcpResources(server);
  registerUcpTools(server);
  return server;
}

async function startStdioServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

module.exports = {
  createMcpServer,
  startStdioServer,
};

if (require.main === module) {
  startStdioServer().catch((err) => {
    console.error('Failed to start MCP server', err);
    process.exit(1);
  });
}
