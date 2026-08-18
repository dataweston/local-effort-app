import { describe, expect, it, vi } from 'vitest';

import itemsSync from '../../backend/api/brain/localBudgetItemsSync.js';
import inferenceEngine from '../../backend/api/brain/inferenceEngine.js';

const { isSoldLine, matchSoldItem } = itemsSync;
const { bucketUnitPriceDrift } = inferenceEngine.__internals;

describe('Local Budget line-item classification', () => {
  it('treats a line with a Square order uid as sold, others as purchased', () => {
    expect(isSoldLine({ sourceUid: 'sq-line-1' })).toBe(true);
    expect(isSoldLine({ sourceUid: null })).toBe(false);
    expect(isSoldLine({})).toBe(false);
  });
});

describe('sold-item catalog matching', () => {
  function prismaWith(hit) {
    return { brainEntity: { findFirst: vi.fn().mockResolvedValue(hit) } };
  }

  it('matches an existing Dish or Product by name or alias', async () => {
    const prisma = prismaWith({ id: 'dish-1', entityType: 'Dish', name: 'Focaccia' });
    const match = await matchSoldItem(prisma, new Map(), 'Focaccia');

    expect(match).toMatchObject({ id: 'dish-1', entityType: 'Dish' });
    const where = prisma.brainEntity.findFirst.mock.calls[0][0].where;
    expect(where.entityType).toEqual({ in: ['Dish', 'Product'] });
    expect(where.tombstonedAt).toBe(null);
  });

  it('returns null rather than minting an unmatched sold item', async () => {
    const prisma = prismaWith(null);
    expect(await matchSoldItem(prisma, new Map(), 'Mystery Special')).toBe(null);
  });

  it('caches lookups, including misses, so one name is queried once', async () => {
    const prisma = prismaWith(null);
    const cache = new Map();
    await matchSoldItem(prisma, cache, 'Mystery Special');
    await matchSoldItem(prisma, cache, 'mystery special');

    expect(prisma.brainEntity.findFirst).toHaveBeenCalledTimes(1);
  });

  it('ignores blank names', async () => {
    const prisma = prismaWith({ id: 'dish-1' });
    expect(await matchSoldItem(prisma, new Map(), '   ')).toBe(null);
    expect(prisma.brainEntity.findFirst).not.toHaveBeenCalled();
  });
});

describe('per-unit price drift from line items', () => {
  const cutoff = new Date('2026-06-01');
  const line = (id, itemName, unitPriceCents, date, extra = {}) => ({
    id,
    occurredAt: new Date(date),
    payload: {
      lineRole: 'purchased',
      vendorEntityId: 'vendor-1',
      itemName,
      unitPriceCents,
      unitOfMeasure: 'lb',
      ...extra,
    },
  });

  it('measures the price of a named item, not the size of the order', () => {
    const drift = bucketUnitPriceDrift([
      line('a', 'Flour', 100, '2026-04-01'),
      line('b', 'Flour', 100, '2026-04-15'),
      line('c', 'Flour', 130, '2026-06-15'),
      line('d', 'Flour', 130, '2026-07-01'),
    ], cutoff);

    const vendor = drift.get('vendor-1');
    expect(vendor.itemName).toBe('Flour');
    expect(vendor.drift).toBeCloseTo(0.3, 5);
    expect(vendor.observations).toBe(4);
    expect(vendor.evIds).toHaveLength(4);
  });

  it('needs two observations in each window before claiming a trend', () => {
    const drift = bucketUnitPriceDrift([
      line('a', 'Flour', 100, '2026-04-01'),
      line('b', 'Flour', 130, '2026-06-15'),
      line('c', 'Flour', 130, '2026-07-01'),
    ], cutoff);

    expect(drift.size).toBe(0);
  });

  it('reports the item that moved most for a vendor', () => {
    const drift = bucketUnitPriceDrift([
      line('a', 'Flour', 100, '2026-04-01'),
      line('b', 'Flour', 100, '2026-04-15'),
      line('c', 'Flour', 110, '2026-06-15'),
      line('d', 'Flour', 110, '2026-07-01'),
      line('e', 'Butter', 200, '2026-04-01'),
      line('f', 'Butter', 200, '2026-04-15'),
      line('g', 'Butter', 300, '2026-06-15'),
      line('h', 'Butter', 300, '2026-07-01'),
    ], cutoff);

    expect(drift.get('vendor-1').itemName).toBe('Butter');
    expect(drift.get('vendor-1').drift).toBeCloseTo(0.5, 5);
  });

  it('ignores sold lines: those are revenue, not input cost', () => {
    const drift = bucketUnitPriceDrift([
      line('a', 'Pizza', 1000, '2026-04-01', { lineRole: 'sold' }),
      line('b', 'Pizza', 1000, '2026-04-15', { lineRole: 'sold' }),
      line('c', 'Pizza', 1400, '2026-06-15', { lineRole: 'sold' }),
      line('d', 'Pizza', 1400, '2026-07-01', { lineRole: 'sold' }),
    ], cutoff);

    expect(drift.size).toBe(0);
  });

  it('keeps two vendors selling the same item apart', () => {
    const drift = bucketUnitPriceDrift([
      line('a', 'Flour', 100, '2026-04-01'),
      line('b', 'Flour', 100, '2026-04-15'),
      line('c', 'Flour', 150, '2026-06-15'),
      line('d', 'Flour', 150, '2026-07-01'),
      { ...line('e', 'Flour', 100, '2026-04-01'), payload: { lineRole: 'purchased', vendorEntityId: 'vendor-2', itemName: 'Flour', unitPriceCents: 100 } },
      { ...line('f', 'Flour', 100, '2026-04-15'), payload: { lineRole: 'purchased', vendorEntityId: 'vendor-2', itemName: 'Flour', unitPriceCents: 100 } },
      { ...line('g', 'Flour', 100, '2026-06-15'), payload: { lineRole: 'purchased', vendorEntityId: 'vendor-2', itemName: 'Flour', unitPriceCents: 100 } },
      { ...line('h', 'Flour', 100, '2026-07-01'), payload: { lineRole: 'purchased', vendorEntityId: 'vendor-2', itemName: 'Flour', unitPriceCents: 100 } },
    ], cutoff);

    expect(drift.get('vendor-1').drift).toBeCloseTo(0.5, 5);
    expect(drift.get('vendor-2').drift).toBe(0);
  });

  it('skips lines with no usable unit price', () => {
    const drift = bucketUnitPriceDrift([
      line('a', 'Flour', null, '2026-04-01'),
      line('b', 'Flour', 0, '2026-04-15'),
      line('c', 'Flour', 130, '2026-06-15'),
      line('d', 'Flour', 130, '2026-07-01'),
    ], cutoff);

    expect(drift.size).toBe(0);
  });
});
