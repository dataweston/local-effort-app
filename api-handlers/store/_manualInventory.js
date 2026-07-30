const MAX_RESERVATION_ATTEMPTS = 3;

const inventoryError = (message, statusCode = 409, code = 'inventory-unavailable') =>
  Object.assign(new Error(message), { statusCode, code });

function getManualInventoryRequirements(items, productMap) {
  const quantities = new Map();
  for (const item of items || []) {
    const product = productMap[item.productId];
    if (product?.inventoryMode !== 'manual') continue;
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + Number(item.qty || 0));
  }
  return [...quantities.entries()].map(([productId, qty]) => ({ productId, qty }));
}

async function reserveManualInventory(client, requirements) {
  if (!requirements.length) return [];
  if (!client) {
    throw inventoryError(
      'Inventory is temporarily unavailable. No payment was taken; please try again shortly.',
      503,
    );
  }

  const ids = requirements.map((entry) => entry.productId);
  const requestedById = Object.fromEntries(
    requirements.map((entry) => [entry.productId, entry.qty]),
  );

  for (let attempt = 1; attempt <= MAX_RESERVATION_ATTEMPTS; attempt += 1) {
    const products = await client.fetch(
      `*[_type == "product" && _id in $ids]{
        _id, _rev, title, inventoryMode, manualQty
      }`,
      {ids},
    );
    const byId = Object.fromEntries((products || []).map((product) => [product._id, product]));
    const reservation = [];

    for (const productId of ids) {
      const product = byId[productId];
      const requested = requestedById[productId];
      if (!product || product.inventoryMode !== 'manual') {
        throw inventoryError('A product changed while you were checking out. No payment was taken.');
      }
      const available = Number.isFinite(product.manualQty) ? Math.max(0, product.manualQty) : 0;
      if (available < requested) {
        const label = product.title || 'A product';
        throw inventoryError(
          `${label} only has ${available} remaining. No payment was taken; please update your cart.`,
        );
      }
      reservation.push({
        productId,
        qty: requested,
        previousQty: available,
        nextQty: available - requested,
        revision: product._rev,
      });
    }

    try {
      let transaction = client.transaction();
      for (const entry of reservation) {
        transaction = transaction.patch(entry.productId, (patch) =>
          patch.ifRevisionId(entry.revision).set({
            manualQty: entry.nextQty,
            lastSyncedAt: new Date().toISOString(),
          }),
        );
      }
      await transaction.commit();
      return reservation;
    } catch (error) {
      const isConflict = error?.statusCode === 409 || error?.response?.statusCode === 409;
      if (!isConflict || attempt === MAX_RESERVATION_ATTEMPTS) throw error;
    }
  }
  return [];
}

async function releaseManualInventory(client, reservation) {
  if (!client || !reservation?.length) return;
  let transaction = client.transaction();
  for (const entry of reservation) {
    transaction = transaction.patch(entry.productId, (patch) =>
      patch
        .inc({manualQty: entry.qty})
        .set({lastSyncedAt: new Date().toISOString()}),
    );
  }
  await transaction.commit();
}

module.exports = {
  getManualInventoryRequirements,
  releaseManualInventory,
  reserveManualInventory,
};
