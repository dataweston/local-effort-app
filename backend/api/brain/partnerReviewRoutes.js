const { getPrisma } = require('../utils/prisma');
const { Prisma } = require('@prisma/client');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { writeLedgerEvent } = require('./ledger');
const { reconcileVendorPayments } = require('./vendorPaymentReconcile');
const verifyAdminRequest = createAdminVerifier();

const PARTNER_RELATIONS = new Set([
  'SUPPLIES', 'PRICED_AT', 'PAYMENT_SENT', 'INVOICED', 'ISSUED_BY',
  'RECONCILED_WITH', 'SOURCED_FROM', 'STOCKED_AT', 'COLLABORATED_WITH',
  'HOSTED_BY', 'MENTIONS', 'MENTIONED_IN_CONTENT', 'TAGGED_ON_INSTAGRAM', 'LOCATED_AT',
]);
const PUBLIC_RELATION_TYPES = new Set(['vendor', 'valued_vendor', 'producer', 'stockist', 'distributor', 'collaborator', 'venue']);

function jsonValue(value) {
  return value === null || value === undefined ? Prisma.JsonNull : value;
}

function evidenceGroup(assertion, vendorId) {
  const other = assertion.srcId === vendorId ? assertion.dst : assertion.src;
  const source = assertion.ledgerEvent?.source || assertion.sourceType || 'unknown';
  const rel = assertion.relType;
  const bucket = rel === 'PRICED_AT' || rel === 'SUPPLIES' || rel === 'SUPPLIED_BY' ? 'products'
    : rel === 'PAYMENT_SENT' || rel === 'SPEND_HISTORY' || rel === 'RECONCILED_WITH' ? 'purchases'
      : rel === 'EMAILED' || rel === 'INVOICED' ? 'communications'
        : rel === 'MENTIONS' ? 'public_mentions' : 'relationships';
  return { key: `${bucket}:${rel}:${source}`, bucket, relType: rel, source, other };
}

function summarizeEvidence(assertions, vendorId) {
  const groups = new Map();
  for (const assertion of assertions) {
    const group = evidenceGroup(assertion, vendorId);
    const current = groups.get(group.key) || { ...group, count: 0, pendingCount: 0, firstAt: null, lastAt: null, samples: [], totalCents: 0 };
    current.count += 1;
    if (assertion.provisional) current.pendingCount += 1;
    const at = assertion.ledgerEvent?.occurredAt || assertion.createdAt;
    if (!current.firstAt || new Date(at) < new Date(current.firstAt)) current.firstAt = at;
    if (!current.lastAt || new Date(at) > new Date(current.lastAt)) current.lastAt = at;
    const amount = Number(assertion.ledgerEvent?.payload?.amountCents || assertion.metadata?.amountCents || 0);
    if (Number.isFinite(amount)) current.totalCents += amount;
    if (current.samples.length < 3 && group.other) current.samples.push(group.other);
    groups.set(group.key, current);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

function cappedEvidenceScore(summary) {
  return Math.round(summary.reduce((score, group) => {
    const base = group.bucket === 'purchases' ? 10 : group.bucket === 'products' ? 7 : group.bucket === 'communications' ? 4 : 3;
    return score + base * Math.min(3, 1 + Math.log10(Math.max(1, group.count)));
  }, 0) * 10) / 10;
}

function vendorCluster(vendor) {
  const text = [vendor.name, ...(vendor.aliases || []).map(a => a.alias)].join(' ').toLowerCase();
  if (/facebook|meta platforms|meta pay|fbads|facebk/.test(text)) return { key: 'meta', label: 'Meta / Facebook advertising', suggestedType: 'advertising_platform', partnerCandidate: false };
  if (/shell|speedway|holiday station|kwik trip|\bbp\b|exxon|\bmobil\b|marathon|circle k|superamerica|fuel|gas station/.test(text)) return { key: 'fuel', label: 'Fuel and gas stations', suggestedType: 'operational_vendor', partnerCandidate: false };
  if (/amazon|amzn|walmart|target\b|costco/.test(text)) return { key: 'marketplace', label: 'Marketplaces and mass retail', suggestedType: 'retailer', partnerCandidate: false };
  if (/xcel|centerpoint|comcast|verizon|at&t|t-mobile|utility/.test(text)) return { key: 'utilities', label: 'Utilities and communications', suggestedType: 'service_provider', partnerCandidate: false };
  if (/co-?op|farm|farms|creamery|dairy|mill|flour|meat|seafood|produce|warehouse|bakery|bread|butter|oil/.test(text)) return { key: 'food_supply', label: 'Food suppliers and producers', suggestedType: 'vendor', partnerCandidate: true };
  return { key: 'other', label: 'Other counterparties', suggestedType: 'observed', partnerCandidate: null };
}

function normalizeVendorIdentity(value) {
  return String(value || '').toLowerCase()
    .replace(/\b(pos|debit|purchase|recurring|payment|invoice|online|store|marketplace)\b/g, ' ')
    .replace(/\b(llc|inc|corp|corporation|company|cooperative|coop|co)\b/g, ' ')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function identitySimilarity(a, b) {
  const left = normalizeVendorIdentity(a); const right = normalizeVendorIdentity(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return Math.min(left.length, right.length) / Math.max(left.length, right.length) >= 0.6 ? 0.92 : 0.72;
  const l = new Set(left.split(' ')); const r = new Set(right.split(' '));
  const shared = [...l].filter(token => r.has(token)).length;
  return shared / new Set([...l, ...r]).size;
}

async function mergeVendorInto(prisma, loser, target) {
  const aliasRows = [...loser.aliases.map(a => ({ entityId: target.id, alias: a.alias, source: a.source })), { entityId: target.id, alias: loser.name, source: 'partner_merge' }];
  await prisma.$transaction([
    prisma.brainAssertion.updateMany({ where: { srcId: loser.id }, data: { srcId: target.id } }),
    prisma.brainAssertion.updateMany({ where: { dstId: loser.id }, data: { dstId: target.id } }),
    prisma.brainAssertion.updateMany({ where: { srcId: target.id, dstId: target.id, retractedAt: null, relType: { not: 'MENU_SNAPSHOT' } }, data: { retractedAt: new Date(), retractedBy: 'system:partner-merge', retractedReason: 'self_edge_after_merge' } }),
    prisma.brainInference.updateMany({ where: { srcId: loser.id }, data: { srcId: target.id } }),
    prisma.brainInference.updateMany({ where: { dstId: loser.id }, data: { dstId: target.id } }),
    prisma.brainInboxItem.updateMany({ where: { resultEntityId: loser.id }, data: { resultEntityId: target.id } }),
    prisma.partnerReviewDecision.updateMany({ where: { vendorEntityId: loser.id }, data: { vendorEntityId: target.id } }),
    prisma.partnerLearnedRule.updateMany({ where: { scopeType: 'vendor', scopeKey: { startsWith: `${loser.id}:` } }, data: { enabled: false, disabledAt: new Date() } }),
    prisma.brainEntityAlias.deleteMany({ where: { entityId: loser.id } }),
    prisma.brainEntityAlias.createMany({ data: aliasRows, skipDuplicates: true }),
    prisma.brainEntity.update({ where: { id: target.id }, data: { properties: { ...(loser.properties || {}), ...(target.properties || {}) } } }),
    prisma.brainEntity.update({ where: { id: loser.id }, data: { tombstonedAt: new Date(), tombstoneReason: `merged_into:${target.id}`, status: 'archived' } }),
  ]);
}

function relationshipGuess(assertions, properties = {}) {
  const explicit = properties.partnerRelationshipType;
  if (explicit) return { value: explicit, confidence: 1, learned: true };
  const rels = new Set(assertions.map(a => a.relType));
  if (rels.has('SUPPLIES') || rels.has('PAYMENT_SENT') || rels.has('INVOICED')) {
    return { value: 'vendor', confidence: 0.88, learned: false };
  }
  if (rels.has('STOCKED_AT')) return { value: 'stockist', confidence: 0.82, learned: false };
  if (rels.has('HOSTED_BY')) return { value: 'venue', confidence: 0.82, learned: false };
  if (rels.has('COLLABORATED_WITH')) return { value: 'collaborator', confidence: 0.76, learned: false };
  return { value: 'observed', confidence: 0.35, learned: false };
}

function registerPartnerReviewRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  app.get('/api/brain/partners/review', async (req, res) => {
    try {
      if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
      const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
      const vendors = await prisma.brainEntity.findMany({
        where: { entityType: { in: ['Vendor', 'Supplier'] }, tombstonedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          aliases: true,
          srcAssertions: {
            where: { retractedAt: null, knownUntil: null },
            orderBy: { createdAt: 'desc' }, take: 100,
            include: { dst: { select: { id: true, name: true, entityType: true } }, ledgerEvent: true },
          },
          dstAssertions: {
            where: { retractedAt: null, knownUntil: null },
            orderBy: { createdAt: 'desc' }, take: 100,
            include: { src: { select: { id: true, name: true, entityType: true } }, ledgerEvent: true },
          },
        },
      });
      const items = vendors.map(v => {
        const assertions = [...v.srcAssertions, ...v.dstAssertions].filter(a => PARTNER_RELATIONS.has(a.relType));
        const evidenceSummary = summarizeEvidence(assertions, v.id);
        const properties = v.properties || {};
        const reviewStatus = properties.partnerReviewStatus || (properties.publicEligible ? 'approved' : 'unreviewed');
        return {
          id: v.id, name: v.name, entityType: v.entityType, status: v.status,
          properties, aliases: v.aliases, relationshipGuess: relationshipGuess(assertions, properties),
          reviewStatus, cluster: vendorCluster(v), evidenceScore: cappedEvidenceScore(evidenceSummary), evidenceSummary,
          rawEvidenceCount: assertions.length,
          pendingCount: assertions.filter(a => a.provisional).length,
          evidence: assertions.filter(a => a.relType !== 'PRICED_AT').slice(0, 20).map(a => ({
            id: a.id, relType: a.relType, confidence: a.confidence, provisional: a.provisional,
            sourceType: a.sourceType, createdAt: a.createdAt, metadata: a.metadata,
            other: a.srcId === v.id ? a.dst : a.src,
            ledgerEvent: a.ledgerEvent ? { eventType: a.ledgerEvent.eventType, source: a.ledgerEvent.source, occurredAt: a.ledgerEvent.occurredAt, payload: a.ledgerEvent.payload } : null,
          })),
        };
      });
      for (const item of items) {
        item.mergeCandidates = items.filter(candidate => candidate.id !== item.id).map(candidate => ({
          id: candidate.id, name: candidate.name,
          score: item.cluster.key === 'meta' && candidate.cluster.key === 'meta' ? Math.max(0.95, identitySimilarity(item.name, candidate.name)) : identitySimilarity(item.name, candidate.name),
          evidenceCount: candidate.rawEvidenceCount,
        })).filter(candidate => candidate.score >= 0.72).sort((a, b) => b.score - a.score).slice(0, 5);
      }
      items.sort((a, b) => {
        const stateRank = { unreviewed: 0, draft: 1, approved: 2, rejected: 3 };
        return (stateRank[a.reviewStatus] - stateRank[b.reviewStatus])
          || (Number(b.rawEvidenceCount > 0) - Number(a.rawEvidenceCount > 0))
          || (b.evidenceScore - a.evidenceScore);
      });
      return res.json({ ok: true, items, count: items.length });
    } catch (err) {
      logger?.error({ err }, 'brain: partner review list error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.post('/api/brain/partners/reconcile-payments', async (req, res) => {
    if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
    const result = await reconcileVendorPayments({ apply: req.body?.apply === true, daysBack: Math.min(Number(req.body?.daysBack || 1095), 1095), logger });
    return res.json({ ok: true, ...result });
  });

  app.post('/api/brain/partners/batch-review', async (req, res) => {
    try {
      if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
      const ids = [...new Set((Array.isArray(req.body?.vendorIds) ? req.body.vendorIds : []).filter(Boolean))].slice(0, 200);
      const action = String(req.body?.action || 'save_draft');
      if (!ids.length) return res.status(400).json({ error: 'vendorIds required' });
      if (!['save_draft', 'approve', 'reject'].includes(action)) return res.status(400).json({ error: 'invalid review action' });
      const relationshipType = req.body?.partnerRelationshipType ? String(req.body.partnerRelationshipType) : null;
      const tier = req.body?.partnerTier ? String(req.body.partnerTier) : null;
      const vendors = await prisma.brainEntity.findMany({ where: { id: { in: ids }, entityType: { in: ['Vendor', 'Supplier'] }, tombstonedAt: null } });
      const decisions = [];
      for (const vendor of vendors) {
        const properties = { ...(vendor.properties || {}) };
        if (relationshipType) properties.partnerRelationshipType = relationshipType;
        if (tier) properties.partnerTier = tier;
        properties.partnerReviewStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'draft';
        properties.publicEligible = action === 'approve' && PUBLIC_RELATION_TYPES.has(properties.partnerRelationshipType);
        properties.partnerReviewedAt = new Date().toISOString();
        properties.partnerReviewedBy = 'admin:partner-batch-review';
        await prisma.brainEntity.update({ where: { id: vendor.id }, data: { properties, visibility: properties.publicEligible ? 'public' : 'private' } });
        const decision = await prisma.partnerReviewDecision.create({ data: {
          vendorEntityId: vendor.id, taskType: 'batch_classification', fieldName: 'partnerReviewStatus',
          proposedValue: jsonValue(vendor.properties?.partnerReviewStatus), chosenValue: properties.partnerReviewStatus,
          action, reason: req.body?.reason || 'partner_batch_review', evidenceIds: [], reviewer: 'admin:partner-batch-review', ruleVersion: 'partner-v2',
          featureSnapshot: { clusterKey: req.body?.clusterKey || null, relationshipType },
        } });
        decisions.push(decision.id);
      }
      await writeLedgerEvent({ eventType: 'partner.batch_review_decision', source: 'brain_partner_review', sourceId: decisions.join(':'), occurredAt: new Date(), actorType: 'admin', actorId: 'partner-batch-review', payload: { vendorIds: vendors.map(v => v.id), action, relationshipType, tier, decisions } });
      return res.json({ ok: true, updated: vendors.length, decisions });
    } catch (err) {
      logger?.error({ err }, 'brain: partner batch review error');
      return res.status(500).json({ error: err?.message || 'batch-review-failed' });
    }
  });

  app.post('/api/brain/partners/merge', async (req, res) => {
    try {
      if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
      const targetId = String(req.body?.targetId || '');
      const sourceIds = [...new Set((Array.isArray(req.body?.sourceIds) ? req.body.sourceIds : []).filter(id => id && id !== targetId))].slice(0, 50);
      if (!targetId || !sourceIds.length) return res.status(400).json({ error: 'targetId and sourceIds required' });
      let target = await prisma.brainEntity.findFirst({ where: { id: targetId, entityType: { in: ['Vendor', 'Supplier'] }, tombstonedAt: null }, include: { aliases: true } });
      if (!target) return res.status(404).json({ error: 'canonical vendor not found' });
      const merged = [];
      for (const sourceId of sourceIds) {
        const loser = await prisma.brainEntity.findFirst({ where: { id: sourceId, entityType: { in: ['Vendor', 'Supplier'] }, tombstonedAt: null }, include: { aliases: true } });
        if (!loser) continue;
        await mergeVendorInto(prisma, loser, target);
        merged.push({ id: loser.id, name: loser.name });
        target = await prisma.brainEntity.findUnique({ where: { id: targetId }, include: { aliases: true } });
      }
      const event = await writeLedgerEvent({ eventType: 'partner.entities_merged', source: 'brain_partner_review', occurredAt: new Date(), actorType: 'admin', actorId: 'partner-review', payload: { targetId, targetName: target.name, merged } });
      for (const row of merged) {
        const descriptor = normalizeVendorIdentity(row.name);
        if (!descriptor) continue;
        await prisma.partnerLearnedRule.upsert({
          where: { taskType_scopeType_scopeKey: { taskType: 'vendor_identity', scopeType: 'merchant_descriptor', scopeKey: descriptor } },
          create: { taskType: 'vendor_identity', scopeType: 'merchant_descriptor', scopeKey: descriptor, conditions: { normalizedDescriptor: descriptor }, outcome: { vendorEntityId: targetId, vendorName: target.name }, createdBy: 'admin:partner-merge', confidence: 1 },
          update: { outcome: { vendorEntityId: targetId, vendorName: target.name }, enabled: true, disabledAt: null, supportCount: { increment: 1 }, successCount: { increment: 1 }, confidence: 1 },
        });
      }
      if (merged.some(row => /^facebk\b/i.test(row.name))) {
        await prisma.partnerLearnedRule.upsert({
          where: { taskType_scopeType_scopeKey: { taskType: 'vendor_identity', scopeType: 'merchant_prefix', scopeKey: 'facebk' } },
          create: { taskType: 'vendor_identity', scopeType: 'merchant_prefix', scopeKey: 'facebk', conditions: { prefix: 'facebk' }, outcome: { vendorEntityId: targetId, vendorName: target.name }, createdBy: 'admin:partner-merge', confidence: 1 },
          update: { outcome: { vendorEntityId: targetId, vendorName: target.name }, enabled: true, disabledAt: null, supportCount: { increment: merged.filter(row => /^facebk\b/i.test(row.name)).length }, successCount: { increment: merged.filter(row => /^facebk\b/i.test(row.name)).length }, confidence: 1 },
        });
      }
      await prisma.partnerReviewDecision.create({ data: { vendorEntityId: targetId, taskType: 'identity_merge', fieldName: 'canonicalVendor', proposedValue: merged, chosenValue: { id: targetId, name: target.name }, action: 'merge', reason: req.body?.reason || 'confirmed similar vendor identities', evidenceIds: [event.id], reviewer: 'admin:partner-review', ruleVersion: 'partner-v2', featureSnapshot: { normalizedTarget: normalizeVendorIdentity(target.name), aliasesLearned: merged.map(row => row.name) } } });
      return res.json({ ok: true, targetId, merged });
    } catch (err) {
      logger?.error({ err }, 'brain: partner merge error');
      return res.status(500).json({ error: err?.message || 'merge-failed' });
    }
  });

  app.patch('/api/brain/partners/:id/review', async (req, res) => {
    try {
      if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
      const current = await prisma.brainEntity.findFirst({ where: { id: req.params.id, entityType: { in: ['Vendor', 'Supplier'] }, tombstonedAt: null } });
      if (!current) return res.status(404).json({ error: 'vendor not found' });
      const action = String(req.body?.action || 'save_draft');
      if (!['save_draft', 'approve', 'reject'].includes(action)) return res.status(400).json({ error: 'invalid review action' });
      const allowed = ['partnerRelationshipType', 'partnerTier', 'website', 'instagram', 'physicalAddress', 'whatWeBuy', 'reviewNotes'];
      const next = { ...(current.properties || {}) };
      for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) next[key] = req.body[key];
      next.partnerReviewStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'draft';
      next.publicEligible = action === 'approve' && PUBLIC_RELATION_TYPES.has(next.partnerRelationshipType);
      next.partnerReviewedAt = new Date().toISOString();
      next.partnerReviewedBy = 'admin:partner-review';
      const changedFields = [...allowed, 'partnerReviewStatus', 'publicEligible'].filter(key => (key === 'partnerReviewStatus' || key === 'publicEligible' || Object.prototype.hasOwnProperty.call(req.body || {}, key))
        && JSON.stringify((current.properties || {})[key]) !== JSON.stringify(req.body[key]));
      if (!changedFields.includes('partnerReviewStatus') && (current.properties || {}).partnerReviewStatus !== next.partnerReviewStatus) changedFields.push('partnerReviewStatus');
      if (!changedFields.includes('publicEligible') && (current.properties || {}).publicEligible !== next.publicEligible) changedFields.push('publicEligible');
      const entity = await prisma.brainEntity.update({ where: { id: current.id }, data: { properties: next, visibility: next.publicEligible ? 'public' : 'private' } });
      const evidenceIds = Array.isArray(req.body?.evidenceIds) ? req.body.evidenceIds.filter(Boolean).slice(0, 200) : [];
      const decisions = [];
      for (const fieldName of changedFields) {
        const decision = await prisma.partnerReviewDecision.create({ data: {
          vendorEntityId: current.id, taskType: fieldName === 'partnerRelationshipType' ? 'relationship_classification' : 'partner_field',
          fieldName, proposedValue: jsonValue((current.properties || {})[fieldName]), chosenValue: jsonValue(next[fieldName]),
          action, reason: req.body?.decisionReason || null, evidenceIds,
          featureSnapshot: { entityType: current.entityType, canonicalName: current.canonicalName }, reviewer: 'admin:partner-review', ruleVersion: 'partner-v1',
        } });
        decisions.push(decision.id);
        if (req.body?.learnRule === true && ['partnerRelationshipType', 'website', 'instagram', 'physicalAddress'].includes(fieldName)) {
          const scopeKey = `${current.id}:${fieldName}`;
          await prisma.partnerLearnedRule.upsert({
            where: { taskType_scopeType_scopeKey: { taskType: 'partner_field', scopeType: 'vendor', scopeKey } },
            create: { taskType: 'partner_field', scopeType: 'vendor', scopeKey, conditions: { vendorEntityId: current.id, fieldName }, outcome: { value: req.body[fieldName] }, createdBy: 'admin:partner-review' },
            update: { outcome: { value: req.body[fieldName] }, supportCount: { increment: 1 }, successCount: { increment: 1 }, confidence: 1, enabled: true, disabledAt: null },
          });
        }
      }
      if (changedFields.length) await writeLedgerEvent({
        eventType: 'partner.review_decision', source: 'brain_partner_review', sourceId: decisions.join(':'), occurredAt: new Date(),
        actorType: 'admin', actorId: 'partner-review', payload: { vendorEntityId: current.id, changedFields, decisionIds: decisions, evidenceIds },
      });
      return res.json({ ok: true, entity, decisions });
    } catch (err) {
      logger?.error({ err }, 'brain: partner review update error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.get('/api/brain/partners/rules', async (req, res) => {
    if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
    const rules = await prisma.partnerLearnedRule.findMany({ orderBy: [{ enabled: 'desc' }, { updatedAt: 'desc' }], take: 500 });
    return res.json({ ok: true, rules });
  });

  app.patch('/api/brain/partners/rules/:id', async (req, res) => {
    if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
    const enabled = req.body?.enabled !== false;
    const rule = await prisma.partnerLearnedRule.update({ where: { id: req.params.id }, data: { enabled, disabledAt: enabled ? null : new Date() } });
    return res.json({ ok: true, rule });
  });

  app.get('/api/public/partners', async (_req, res) => {
    const rows = await prisma.brainEntity.findMany({
      where: { entityType: { in: ['Vendor', 'Supplier'] }, visibility: 'public', tombstonedAt: null }, orderBy: { name: 'asc' },
      select: { id: true, name: true, properties: true, updatedAt: true },
    });
    const partners = rows.filter(row => row.properties?.publicEligible === true).map(row => ({
      id: row.id, name: row.name, relationshipType: row.properties.partnerRelationshipType,
      tier: row.properties.partnerTier || null, website: row.properties.website || null,
      instagram: row.properties.instagram || null, physicalAddress: row.properties.physicalAddress || null,
      whatWeBuy: row.properties.whatWeBuy || [], updatedAt: row.updatedAt,
    }));
    res.set('Cache-Control', 'public, max-age=300, s-maxage=1800');
    const jsonLd = {
      '@context': 'https://schema.org', '@type': 'ItemList', name: 'Local Effort vendor and partner network',
      itemListElement: partners.map((partner, index) => ({ '@type': 'ListItem', position: index + 1, item: {
        '@type': 'Organization', '@id': `https://www.localeffortfood.com/api/public/partners#${partner.id}`,
        name: partner.name, url: partner.website || undefined, sameAs: partner.instagram ? [partner.instagram] : undefined,
        address: partner.physicalAddress ? { '@type': 'PostalAddress', streetAddress: partner.physicalAddress } : undefined,
        description: partner.whatWeBuy.length ? `Local Effort buys ${partner.whatWeBuy.join(', ')} from ${partner.name}.` : undefined,
      } })),
    };
    return res.json({ ok: true, partners, count: partners.length, jsonLd });
  });
}

module.exports = { registerPartnerReviewRoutes, normalizeVendorIdentity, identitySimilarity, vendorCluster };
