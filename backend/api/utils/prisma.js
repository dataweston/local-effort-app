const { PrismaClient } = require('@prisma/client');

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
  if (!resolved) return null;
  return new PrismaClient();
};

const prisma = globalRef.__localEffortPrisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalRef.__localEffortPrisma = prisma;
}

module.exports = { prisma, ensureDatabaseUrl };
