import { describe, it, expect } from 'vitest';

const fulfillment = require('../../api-handlers/store/_fulfillment');
const { catalog, productMap, validateSmithOrder } = require('../../api-handlers/store/_pizzaOnSmith');

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

  it('uses an inclusive October 13–28 window and week-of November 2 fulfillment label', () => {
    expect(fulfillment.PIZZA_ORDER_START).toBe('2026-10-13T00:00:00-05:00');
    expect(fulfillment.PIZZA_ORDER_END).toBe('2026-10-29T00:00:00-05:00');
    expect(fulfillment.PIZZA_FULFILLMENT_DATE).toBe('Week of November 2, 2026');
  });
});
