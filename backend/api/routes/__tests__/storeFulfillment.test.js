import {describe, expect, it} from 'vitest';
import fulfillment from '../../../../api-handlers/store/_fulfillment';

const {
  CHEZ_GARAGE_DELIVERY_FEE_CENTS,
  CHEZ_GARAGE_DELIVERY_MINIMUM_CENTS,
  pickupByStore,
  resolveDeliveryMinimum,
  resolveFulfillmentFee,
} = fulfillment;

describe('Chez Garage fulfillment policy', () => {
  it('charges $10 for delivery and nothing for pickup', () => {
    expect(CHEZ_GARAGE_DELIVERY_FEE_CENTS).toBe(1000);
    expect(resolveFulfillmentFee('chez-garage', false)).toBe(1000);
    expect(resolveFulfillmentFee('chez-garage', true)).toBe(0);
  });

  it('requires $75 of merchandise for delivery only', () => {
    expect(CHEZ_GARAGE_DELIVERY_MINIMUM_CENTS).toBe(7500);
    expect(resolveDeliveryMinimum('chez-garage')).toBe(7500);
    expect(resolveDeliveryMinimum('sale')).toBe(0);
  });

  it('places the requested pickup address in confirmation data', () => {
    expect(pickupByStore['chez-garage'].address).toBe(
      '4379 Mackey Ave, Minneapolis MN 55424',
    );
  });
});
