let PrismaClient = null;
try {
  ({ PrismaClient } = require('@prisma/client'));
} catch (error) {
  console.warn('[prisma] @prisma/client unavailable:', error && error.message ? error.message : error);
}

const resolveDatabaseUrl = () =>
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.VERCEL_POSTGRES_URL ||
  process.env.VERCEL_POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NO_SSL ||
  '';

const ensureDatabaseUrl = () => {
  const resolved = resolveDatabaseUrl();
  if (!process.env.DATABASE_URL && resolved) {
    process.env.DATABASE_URL = resolved;
  }
  return resolved || '';
};

const globalRef = globalThis;

// The long brain passes (inference, order projection) were dying on
// "Timed out fetching a new connection from the connection pool (timeout 10,
// limit 5)" in the Vercel function. Widen the pool unless the URL already
// pins its own values. Overridable via PRISMA_CONNECTION_LIMIT / PRISMA_POOL_TIMEOUT.
const withPoolParams = (url) => {
  if (!url || !/^postgres(ql)?:/i.test(url)) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', process.env.PRISMA_CONNECTION_LIMIT || '10');
    }
    if (!u.searchParams.has('pool_timeout')) {
      u.searchParams.set('pool_timeout', process.env.PRISMA_POOL_TIMEOUT || '30');
    }
    return u.toString();
  } catch {
    return url;
  }
};

const createPrismaClient = () => {
  const resolved = ensureDatabaseUrl();
  if (!resolved || !PrismaClient) return null;
  try {
    return new PrismaClient({ datasources: { db: { url: withPoolParams(resolved) } } });
  } catch (error) {
    console.warn('[prisma] failed to initialize client:', error && error.message ? error.message : error);
    return null;
  }
};

const prisma = globalRef.__localEffortPrisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalRef.__localEffortPrisma = prisma;
}

// getPrisma() — factory-style accessor used by brain modules
const getPrisma = () => prisma;

module.exports = { prisma, getPrisma, ensureDatabaseUrl };
