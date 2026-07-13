const { getPrisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { writeLedgerEvent } = require('./ledger');
const { reconcileVendorPayments } = require('./vendorPaymentReconcile');
const verifyAdminRequest = createAdminVerifier();

const PARTNER_RELATIONS = new Set([
  'SUPPLIES', 'PRICED_AT', 'PAYMENT_SENT', 'INVOICED', 'ISSUED_BY',
  'RECONCILED_WITH', 'SOURCED_FROM', 'STOCKED_AT', 'COLLABORATED_WITH',
  'HOSTED_BY', 'MENTIONS', 'MENTIONED_IN_CONTENT', 'TAGGED_ON_INSTAGRAM', 'LOCATED_AT',
]);

function evidenceWeight(assertion) {
  const source = String(assertion.sourceType || assertion.ledgerEvent?.source || '').toLowerCase();
  const rel = String(assertion.relType || '').toUpperCase();
  if (rel === 'PAYMENT_SENT' || rel === 'RECONCILED_WITH') return 10;
  if (rel === 'INVOICED' || rel === 'ISSUED_BY') return 9;
  if (rel === 'SUPPLIES' || rel === 'PRICED_AT' || rel === 'SOURCED_FROM') return 8;
  if (source.includes('gmail') && /receipt|invoice|order/.test(JSON.stringify(assertion.metadata || {}).toLowerCase())) return 8;
  if (source.includes('instagram')) return 4;
  if (source.includes('repo')) return 3;
  return 2;
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
      const limit = Math.min(parseInt(req.query.limit, 10) || 100, 250);
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
        const score = assertions.reduce((sum, a) => sum + evidenceWeight(a) * Number(a.confidence || 1), 0);
        const properties = v.properties || {};
        return {
          id: v.id, name: v.name, entityType: v.entityType, status: v.status,
          properties, aliases: v.aliases, relationshipGuess: relationshipGuess(assertions, properties),
          evidenceScore: Math.round(score * 10) / 10,
          pendingCount: assertions.filter(a => a.provisional).length,
          evidence: assertions.slice(0, 40).map(a => ({
            id: a.id, relType: a.relType, confidence: a.confidence, provisional: a.provisional,
            sourceType: a.sourceType, createdAt: a.createdAt, metadata: a.metadata,
            other: a.srcId === v.id ? a.dst : a.src,
            ledgerEvent: a.ledgerEvent ? { eventType: a.ledgerEvent.eventType, source: a.ledgerEvent.source, occurredAt: a.ledgerEvent.occurredAt, payload: a.ledgerEvent.payload } : null,
          })),
        };
      }).sort((a, b) => (b.pendingCount - a.pendingCount) || (b.evidenceScore - a.evidenceScore));
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

  app.patch('/api/brain/partners/:id/review', async (req, res) => {
    try {
      if (!await verifyAdminRequest(req)) return res.status(403).json({ error: 'admin only' });
      const current = await prisma.brainEntity.findFirst({ where: { id: req.params.id, entityType: { in: ['Vendor', 'Supplier'] }, tombstonedAt: null } });
      if (!current) return res.status(404).json({ error: 'vendor not found' });
      const allowed = ['partnerRelationshipType', 'partnerTier', 'publicEligible', 'website', 'instagram', 'physicalAddress', 'whatWeBuy', 'reviewNotes'];
      const next = { ...(current.properties || {}) };
      for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) next[key] = req.body[key];
      next.partnerReviewedAt = new Date().toISOString();
      next.partnerReviewedBy = 'admin:partner-review';
      const changedFields = allowed.filter(key => Object.prototype.hasOwnProperty.call(req.body || {}, key)
        && JSON.stringify((current.properties || {})[key]) !== JSON.stringify(req.body[key]));
      const entity = await prisma.brainEntity.update({ where: { id: current.id }, data: { properties: next, visibility: next.publicEligible ? 'public' : 'private' } });
      const evidenceIds = Array.isArray(req.body?.evidenceIds) ? req.body.evidenceIds.filter(Boolean).slice(0, 200) : [];
      const decisions = [];
      for (const fieldName of changedFields) {
        const decision = await prisma.partnerReviewDecision.create({ data: {
          vendorEntityId: current.id, taskType: fieldName === 'partnerRelationshipType' ? 'relationship_classification' : 'partner_field',
          fieldName, proposedValue: (current.properties || {})[fieldName] ?? null, chosenValue: req.body[fieldName] ?? null,
          action: 'accept_with_edit', reason: req.body?.decisionReason || null, evidenceIds,
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

module.exports = { registerPartnerReviewRoutes };
