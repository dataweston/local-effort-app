// POST /api/store/sync-square
// Imports Square Catalog (Items & Variations) into Sanity as product docs (idempotent by squareItemId)
const { Client, Environment } = require('square');
const sanity = require('@sanity/client');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;

const sq = ACCESS_TOKEN ? new Client({ accessToken: ACCESS_TOKEN, environment: Environment.Production }) : null;
const sc = projectId && dataset ? sanity.createClient({ projectId, dataset, token: process.env.SANITY_WRITE_TOKEN, apiVersion: '2023-05-03' }) : null;

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!sq || !sc) return res.status(500).json({ error: 'Square or Sanity not configured' });

    // Fetch Catalog
    const list = await sq.catalogApi.listCatalog(undefined, 'ITEM,ITEM_VARIATION');
    const objects = list.result?.objects || [];
    const items = objects.filter(o => o.type === 'ITEM');
    const variations = objects.filter(o => o.type === 'ITEM_VARIATION');

    // Index variations by item_id
    const byItem = new Map();
    for (const v of variations) {
      const itemId = v.itemVariationData?.itemId;
      if (!itemId) continue;
      if (!byItem.has(itemId)) byItem.set(itemId, []);
      byItem.get(itemId).push(v);
    }

    const tx = sc.transaction();
    for (const it of items) {
      const d = it.itemData || {};
      const title = d.name || 'Square Item';
      const id = it.id;
      const vars = (byItem.get(id) || []).map((v) => ({
        _type: 'variant',
        name: v.itemVariationData?.name,
        squareVariationId: v.id,
        price: Number(v.itemVariationData?.priceMoney?.amount || 0),
      }));
      // Upsert by squareItemId
      const docId = `square-${id}`;
      tx.createIfNotExists({ _id: docId, _type: 'product', title, shortDescription: d.description || '', price: Number(vars[0]?.price || 0), currency: 'USD', squareItemId: id, active: true });
      tx.patch(docId).set({ variants: vars });
    }
    await tx.commit();
    res.status(200).json({ ok: true, imported: items.length });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Sync failed' });
  }
};
