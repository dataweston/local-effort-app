const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const {
  createMealPrepQuote,
  reviseMealPrepQuote,
} = require('../pricing/quoteService');

const perPersonItemSchema = z.object({
  category: z.enum(['breakfast', 'lunch', 'dinner']),
  pricingMode: z.literal('per_person'),
  mealsPerWeek: z.number().int().min(1).max(31),
  people: z.number().int().min(1).max(1000),
});

const familyItemSchema = z.object({
  category: z.literal('dinner'),
  pricingMode: z.literal('family_flat'),
  mealsPerWeek: z.number().int().min(1).max(31),
  households: z.number().int().min(1).max(100).default(1),
});

const inputSchema = z.object({
  billingCadence: z.enum(['weekly', 'four_week']),
  fulfillment: z.enum(['pickup', 'delivery']),
  membership: z.object({
    status: z.enum(['active_paid', 'new_paid', 'waived']),
    billingCadence: z.enum(['annual', 'monthly']).optional(),
  }),
  items: z.array(z.discriminatedUnion('pricingMode', [perPersonItemSchema, familyItemSchema])).min(1).max(50),
});

const adjustmentSchema = z.object({
  amountCents: z.number().int().min(-100000000).max(100000000).refine((value) => value !== 0),
  reasonCode: z.string().trim().min(1).max(80),
  explanation: z.string().trim().min(1).max(1000),
});

const createQuoteSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  agreementId: z.string().uuid().nullable().optional(),
  sourceId: z.string().trim().min(1).max(240).optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  changeSummary: z.string().trim().max(1000).nullable().optional(),
  input: inputSchema,
  adjustments: z.array(adjustmentSchema).max(20).default([]),
});

const reviseQuoteSchema = z.object({
  changeSummary: z.string().trim().min(1).max(1000),
  input: inputSchema,
  adjustments: z.array(adjustmentSchema).max(20).default([]),
});

function createProductPricingRouter({
  logger = null,
  prismaClient = prisma,
  verifyAdminRequest = createAdminVerifier(),
  quoteService = { createMealPrepQuote, reviseMealPrepQuote },
} = {}) {
  const router = express.Router();

  const guarded = (handler) => async (req, res) => {
    const admin = await verifyAdminRequest(req);
    if (!admin) return res.status(401).json({ error: 'pricing-admin-unauthorized' });
    if (!prismaClient) return res.status(503).json({ error: 'database unavailable' });
    try {
      return await handler(req, res, admin);
    } catch (error) {
      logger?.error?.({ err: error, path: req.path }, 'product pricing route failed');
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: 'pricing-request-invalid', details: error.issues });
      }
      return res.status(error?.statusCode || 500).json({ error: error?.message || 'internal-error' });
    }
  };

  router.get('/catalog', guarded(async (_req, res) => {
    const [products, priceBook] = await Promise.all([
      prismaClient.commercialProduct.findMany({
        orderBy: { name: 'asc' },
        include: { offers: { orderBy: { name: 'asc' } }, inventoryResources: true },
      }),
      prismaClient.priceBook.findFirst({
        where: { key: 'local-effort-standard', status: 'published' },
        orderBy: { version: 'desc' },
        include: { rules: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);
    return res.json({ ok: true, products, priceBook });
  }));

  router.post('/meal-prep/quotes', guarded(async (req, res, admin) => {
    const payload = createQuoteSchema.parse(req.body || {});
    const quote = await quoteService.createMealPrepQuote({
      prismaClient,
      ...payload,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      actor: admin.email || admin.id,
    });
    return res.status(201).json({ ok: true, quote });
  }));

  router.post('/meal-prep/quotes/:quoteId/revisions', guarded(async (req, res, admin) => {
    const payload = reviseQuoteSchema.parse(req.body || {});
    const quote = await quoteService.reviseMealPrepQuote({
      prismaClient,
      quoteId: req.params.quoteId,
      ...payload,
      actor: admin.email || admin.id,
    });
    return res.status(201).json({ ok: true, quote });
  }));

  return router;
}

module.exports = { createProductPricingRouter, inputSchema };
