import {describe, expect, it, vi} from 'vitest';
import inventory from '../../../../api-handlers/store/_manualInventory';

const {
  getManualInventoryRequirements,
  releaseManualInventory,
  reserveManualInventory,
} = inventory;

function makeClient(products) {
  const operations = [];
  const commit = vi.fn(async () => ({transactionId: 'test'}));
  const client = {
    fetch: vi.fn(async () => products),
    transaction() {
      const transaction = {
        patch(id, callback) {
          const operation = {id};
          const builder = {
            ifRevisionId(revision) {
              operation.revision = revision;
              return builder;
            },
            set(values) {
              operation.set = {...(operation.set || {}), ...values};
              return builder;
            },
            inc(values) {
              operation.inc = values;
              return builder;
            },
          };
          callback(builder);
          operations.push(operation);
          return transaction;
        },
        commit,
      };
      return transaction;
    },
  };
  return {client, commit, operations};
}

describe('manual store inventory', () => {
  it('combines cart lines for manually managed products only', () => {
    const requirements = getManualInventoryRequirements(
      [
        {productId: 'pizza', qty: 2},
        {productId: 'pizza', qty: 1},
        {productId: 'delivery', qty: 8},
      ],
      {
        pizza: {inventoryMode: 'manual'},
        delivery: {inventoryMode: 'unmanaged'},
      },
    );
    expect(requirements).toEqual([{productId: 'pizza', qty: 3}]);
  });

  it('reserves stock with a revision guard', async () => {
    const {client, operations} = makeClient([
      {
        _id: 'pizza',
        _rev: 'revision-1',
        title: 'Pizza',
        inventoryMode: 'manual',
        manualQty: 5,
      },
    ]);

    const reservation = await reserveManualInventory(client, [{productId: 'pizza', qty: 2}]);

    expect(reservation[0]).toMatchObject({productId: 'pizza', previousQty: 5, nextQty: 3});
    expect(operations[0]).toMatchObject({
      id: 'pizza',
      revision: 'revision-1',
      set: {manualQty: 3},
    });
  });

  it('rejects insufficient stock before payment', async () => {
    const {client, commit} = makeClient([
      {
        _id: 'pizza',
        _rev: 'revision-1',
        title: 'Pizza',
        inventoryMode: 'manual',
        manualQty: 1,
      },
    ]);

    await expect(
      reserveManualInventory(client, [{productId: 'pizza', qty: 2}]),
    ).rejects.toMatchObject({statusCode: 409, code: 'inventory-unavailable'});
    expect(commit).not.toHaveBeenCalled();
  });

  it('restores a reservation when payment fails', async () => {
    const {client, operations} = makeClient([]);
    await releaseManualInventory(client, [{productId: 'pizza', qty: 2}]);
    expect(operations[0]).toMatchObject({id: 'pizza', inc: {manualQty: 2}});
  });
});
