/**
 * Shared Prisma client for every api-handlers/** endpoint.
 *
 * Historically each of ~49 handler files instantiated its own
 * `new PrismaClient()`. That's harmless against a self-managed connection
 * pooler, but this app's DATABASE_URL points at Prisma Postgres (hosted,
 * small connection cap) and the whole app runs as ONE Vercel serverless
 * function (see AGENTS.md) — so 49 independently-constructed clients could
 * open 49x the connections a single process actually needs, exhausting the
 * cap under concurrent traffic.
 *
 * This module just re-exports the real singleton from
 * backend/api/utils/prisma.js (module-scope + globalThis-cached, so
 * require() caching combined with the global cache guarantees exactly one
 * PrismaClient per process even across hot-reload in dev). Handlers keep
 * their existing `if (!prisma) return res.status(503)...` null-check
 * contract unchanged — `prisma` here is `null` under the exact same
 * conditions (missing DATABASE_URL, @prisma/client unavailable, or client
 * construction throwing) that the old per-file try/catch produced.
 *
 * Usage in a handler:
 *   const { prisma } = require('../_lib/prisma'); // from api-handlers/hub/*.js
 *   const { prisma } = require('../../_lib/prisma'); // from api-handlers/weekly-order/admin/*.js
 */
module.exports = require('../../backend/api/utils/prisma');
