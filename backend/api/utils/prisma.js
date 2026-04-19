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

const createPrismaClient = () => {
  const resolved = ensureDatabaseUrl();
  if (!resolved || !PrismaClient) return null;
  try {
    return new PrismaClient();
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
