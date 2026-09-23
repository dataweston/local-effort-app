const crypto = require('crypto');
const { buildMealPrepPolicy, calculateMealPrepQuote } = require('./mealPrepCalculator');

const PRICE_BOOK_KEY = 'local-effort-standard';
const MEAL_PREP_PRODUCT_KEY = 'meal_prep';
const MEAL_PREP_OFFER_KEY = 'meal_prep_standard';

class PricingConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PricingConflictError';
    this.statusCode = 409;
  }
}

async function loadPublishedPriceBook(prismaClient, now = new Date()) {
  const priceBook = await prismaClient.priceBook.findFirst({
    where: {
      key: PRICE_BOOK_KEY,
      status: 'published',
      effectiveAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { rules: { where: { calculator: 'meal_prep' }, orderBy: { sortOrder: 'asc' } } },
    orderBy: { version: 'desc' },
  });
  if (!priceBook) throw new Error('No effective published price book is available');
  return priceBook;
}

function revisionData({ calculation, input, priceBookId, revisionNumber, adjustments, changeSummary, actor }) {
  return {
    priceBookId,
    revisionNumber,
    standardSubtotalCents: calculation.standardSubtotalCents,
    adjustedSubtotalCents: calculation.adjustedSubtotalCents,
    feesCents: calculation.deliveryCents,
    separateChargesCents: calculation.membershipDueCents,
    totalCents: calculation.totalCents,
    depositCents: 0,
    creditEarnedCents: calculation.creditEarnedCents,
    inputSnapshot: input,
    calculationSnapshot: calculation,
    changeSummary: changeSummary || null,
    createdBy: actor || null,
    ...(adjustments.length
      ? {
          adjustments: {
            create: adjustments.map((adjustment) => ({
              scope: adjustment.scope,
              amountCents: adjustment.amountCents,
              reasonCode: adjustment.reasonCode,
              explanation: adjustment.explanation,
              createdBy: actor || null,
            })),
          },
        }
      : {}),
  };
}

async function createMealPrepQuote({
  prismaClient,
  input,
  adjustments = [],
  customerId = null,
  agreementId = null,
  sourceSystem = 'product_pricing',
  sourceId = crypto.randomUUID(),
  expiresAt = null,
  changeSummary = null,
  actor = null,
  now = new Date(),
}) {
  const [product, offer, priceBook] = await Promise.all([
    prismaClient.commercialProduct.findUnique({ where: { key: MEAL_PREP_PRODUCT_KEY } }),
    prismaClient.commercialOffer.findUnique({ where: { key: MEAL_PREP_OFFER_KEY } }),
    loadPublishedPriceBook(prismaClient, now),
  ]);
  if (!product || !offer || offer.productId !== product.id) {
    throw new Error('Meal-prep catalog has not been seeded correctly');
  }

  const policy = buildMealPrepPolicy(priceBook.rules);
  const calculation = calculateMealPrepQuote({ policy, input, adjustments });
  const normalizedAdjustments = calculation.adjustments;

  return prismaClient.commercialQuote.create({
    data: {
      productId: product.id,
      offerId: offer.id,
      customerId,
      agreementId,
      businessLineKey: 'weekly_meals',
      status: 'draft',
      currency: priceBook.currency,
      pricingMode: 'meal_prep_exact',
      currentRevisionNumber: 1,
      expiresAt,
      sourceSystem,
      sourceId,
      revisions: {
        create: revisionData({
          calculation,
          input,
          priceBookId: priceBook.id,
          revisionNumber: 1,
          adjustments: normalizedAdjustments,
          changeSummary,
          actor,
        }),
      },
    },
    include: {
      product: true,
      offer: true,
      revisions: { include: { adjustments: true, priceBook: true } },
    },
  });
}

async function reviseMealPrepQuote({
  prismaClient,
  quoteId,
  input,
  adjustments = [],
  changeSummary,
  actor = null,
}) {
  if (!String(changeSummary || '').trim()) {
    throw new Error('changeSummary is required for a quote revision');
  }

  return prismaClient.$transaction(async (tx) => {
    const quote = await tx.commercialQuote.findUnique({
      where: { id: quoteId },
      include: {
        product: true,
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          include: { priceBook: { include: { rules: { where: { calculator: 'meal_prep' } } } } },
        },
      },
    });
    if (!quote || quote.product.key !== MEAL_PREP_PRODUCT_KEY) throw new Error('Meal-prep quote not found');
    if (quote.status === 'accepted' || quote.status === 'cancelled') {
      throw new PricingConflictError(`Cannot revise a ${quote.status} quote`);
    }

    const previous = quote.revisions[0];
    if (!previous?.priceBook) throw new Error('Quote has no pricing revision');
    const policy = buildMealPrepPolicy(previous.priceBook.rules);
    const calculation = calculateMealPrepQuote({ policy, input, adjustments });
    const nextRevisionNumber = quote.currentRevisionNumber + 1;

    const advanced = await tx.commercialQuote.updateMany({
      where: { id: quote.id, currentRevisionNumber: quote.currentRevisionNumber },
      data: { currentRevisionNumber: nextRevisionNumber },
    });
    if (advanced.count !== 1) {
      throw new PricingConflictError('Quote changed while this revision was being saved');
    }

    await tx.commercialQuoteRevision.create({
      data: {
        quoteId: quote.id,
        ...revisionData({
          calculation,
          input,
          priceBookId: previous.priceBookId,
          revisionNumber: nextRevisionNumber,
          adjustments: calculation.adjustments,
          changeSummary: String(changeSummary).trim(),
          actor,
        }),
      },
    });

    return tx.commercialQuote.findUnique({
      where: { id: quote.id },
      include: {
        product: true,
        offer: true,
        revisions: {
          orderBy: { revisionNumber: 'asc' },
          include: { adjustments: true, priceBook: true },
        },
      },
    });
  });
}

module.exports = {
  PricingConflictError,
  createMealPrepQuote,
  loadPublishedPriceBook,
  reviseMealPrepQuote,
};
