import { describe, it, expect } from 'vitest';

const fulfillment = require('../../api-handlers/store/_fulfillment');
const { catalog, productMap, validateSmithOrder } = require('../../api-handlers/store/_pizzaOnSmith');
const { resolvePizzaDrop, pizzaDropStatus } = require('../../api-handlers/store/_pizzaDrop');

const order = [{ productId: Object.keys(productMap)[0], quantity: 1 }];

describe('Pizza on Smith fulfillment terms', () => {
  it('prices pickup, metro delivery, and shipping separately', () => {
    expect(fulfillment.resolveFulfillmentFee(catalog.store, true, 'pickup')).toBe(0);
    expect(fulfillment.resolveFulfillmentFee(catalog.store, false, 'delivery')).toBe(1200);
    expect(fulfillment.resolveFulfillmentFee(catalog.store, false, 'shipping')).toBe(2200);
  });

  it('applies the $100 merchandise minimum only to shipping', () => {
    expect(fulfillment.resolveDeliveryMinimum(catalog.store, 'shipping')).toBe(10000);
    expect(fulfillment.resolveDeliveryMinimum(catalog.store, 'delivery')).toBe(0);
    expect(fulfillment.resolveDeliveryMinimum(catalog.store, 'pickup')).toBe(0);
  });

  it('accepts only matching pickup and fulfillment choices', () => {
    expect(validateSmithOrder(order, catalog.store, true, 'pickup')).toBeNull();
    expect(validateSmithOrder(order, catalog.store, false, 'delivery')).toBeNull();
    expect(validateSmithOrder(order, catalog.store, false, 'shipping')).toBeNull();
    expect(validateSmithOrder(order, catalog.store, true, 'shipping')).toMatch(/fulfillment choice changed/i);
    expect(validateSmithOrder(order, catalog.store, false, 'pickup')).toMatch(/fulfillment choice changed/i);
    expect(validateSmithOrder(order, catalog.store, false, 'overnight')).toMatch(/valid pickup/i);
  });

  it('resolves the ordering window from Sanity fields before the generated snapshot', () => {
    const snapshot = resolvePizzaDrop(null);
    expect(snapshot.opensAt).toBeLessThan(snapshot.closesAt);
    expect(snapshot.fulfillmentLabel).not.toBe('');

    const edited = resolvePizzaDrop({
      dropOpensAt: '2026-11-10T09:00:00-06:00',
      dropClosesAt: '2026-11-12T21:00:00-06:00',
      fulfillmentLabel: 'Saturday, November 14',
    });
    expect(edited.opensAt).toBe(Date.parse('2026-11-10T09:00:00-06:00'));
    expect(edited.fulfillmentLabel).toBe('Saturday, November 14');
  });

  it('treats the window as open from its start up to, not including, its end', () => {
    const drop = { opensAt: 1000, closesAt: 2000 };
    expect(pizzaDropStatus(drop, 999)).toBe('upcoming');
    expect(pizzaDropStatus(drop, 1000)).toBe('open');
    expect(pizzaDropStatus(drop, 1999)).toBe('open');
    expect(pizzaDropStatus(drop, 2000)).toBe('closed');
    expect(pizzaDropStatus({ opensAt: null, closesAt: null }, 1500)).toBe('closed');
  });
});
