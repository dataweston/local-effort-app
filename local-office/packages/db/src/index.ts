import { PrismaClient } from '../generated/client';

type GlobalPrisma = {
  prisma?: PrismaClient;
};

const globalRef = globalThis as GlobalPrisma;

export const prisma = globalRef.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalRef.prisma = prisma;
}

export * from '../generated/client';
