const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateSmithOrder, productMap } = require('../../api-handlers/store/_pizzaOnSmith');
const { pickupByStore } = require('../../api-handlers/store/_fulfillment');
const {
  getGeneratedSaleProductMap,
  getGeneratedSaleProducts,
} = require('../../api-handlers/store/_saleCatalog');
const price = require('../../api-handlers/store/price');
const quote = async (items, extra = {}) => {
  let status = 200,
    body;
  await price(
    { method: 'POST', body: { items, store: 'pizza-on-smith', pickup: true, ...extra } },
    {
      status(value) {
        status = value;
        return this;
      },
      json(value) {
        body = value;
        return this;
      },
    }
  );
  return { status, body };
};
test('server prices all offers and ignores client price/total tampering', async () => {
  const expected = [3400, 5900, 1450, 1450, 3200];
  const items = Object.keys(productMap).map((productId) => ({
    productId,
    qty: 2,
    unitPrice: 1,
    price: 1,
  }));
  const result = await quote(items);
  assert.equal(result.status, 200);
  assert.deepEqual(
    result.body.lines.map((l) => l.unitPrice),
    expected
  );
  assert.equal(result.body.total, 30800);
  assert.equal(result.body.fulfillmentFee, 0);
});
test('rejects delivery, mixed-store orders, unknown products and unoffered modifiers', async () => {
  const items = [{ productId: 'smith-cheese-3', qty: 1 }];
  for (const extra of [{ pickup: false }, { store: 'sale' }])
    assert.equal((await quote(items, extra)).status, 422);
  assert.equal((await quote([...items, { productId: 'unrelated', qty: 1 }])).status, 422);
  assert.equal((await quote([{ ...items[0], variationId: 'fake' }])).status, 422);
  assert.equal((await quote([{ ...items[0], addOnIndices: [0] }])).status, 422);
  assert.equal(validateSmithOrder([{ productId: 'regular-sale' }], 'sale', false), null);
});
test('invalid quantities cannot reach payment pricing', async () => {
  for (const qty of [0, -1, 0.5, 'bad'])
    assert.equal((await quote([{ productId: 'smith-cheese-6', qty }])).status, 400);
});
test('same canonical products serve checkout without adding Smith products to the sale catalog', () => {
  assert.equal(getGeneratedSaleProductMap(['smith-cheese-6'])['smith-cheese-6'].price, 5900);
  assert.ok(getGeneratedSaleProducts().every((p) => !p.id.startsWith('smith-')));
  assert.equal(pickupByStore['pizza-on-smith'].date, 'Tuesdays');
  assert.equal(pickupByStore['pizza-on-smith'].address, '604 Smith Ave S, West St. Paul, MN');
});
