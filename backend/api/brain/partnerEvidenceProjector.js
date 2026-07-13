/**
 * Partner evidence projectors.
 *
 * Turns repository mentions and exported Instagram posts into immutable,
 * idempotent ledger evidence and provisional graph assertions. The importer is
 * deliberately connector-agnostic: Composio (or a manual export) only needs to
 * produce JSON; credentials never become part of the graph pipeline.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getPrisma } = require('../utils/prisma');
const { writeLedgerEvent, findOrCreateEntity } = require('./ledger');

const REPO_ROOTS = ['src', 'public', 'studio', 'backend', 'api-handlers', 'scripts', 'docs'];
const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.txt', '.css', '.csv']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'archive', '.sanity']);

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeText(value) {
  return String(value || '').normalize('NFKC').replace(/[\u2018\u2019]/g, "'");
}

function aliasPattern(alias) {
  const escaped = normalizeText(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s_-]+/g, '[\\s_-]+');
  return new RegExp(`(^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, 'ig');
}

function findVendorMentions(text, vendors, { contextChars = 180 } = {}) {
  const source = normalizeText(text);
  const found = [];
  for (const vendor of vendors || []) {
    const names = [...new Set([vendor.name, ...(vendor.aliases || []).map((a) => a.alias || a)].filter((x) => String(x || '').trim().length >= 3))];
    for (const alias of names) {
      const re = aliasPattern(alias);
      let match;
      while ((match = re.exec(source))) {
        const start = match.index + match[1].length;
        found.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          alias: match[2],
          offset: start,
          excerpt: source.slice(Math.max(0, start - contextChars), Math.min(source.length, start + match[2].length + contextChars)).replace(/\s+/g, ' ').trim(),
        });
        if (found.filter((item) => item.vendorId === vendor.id).length >= 20) break;
      }
    }
  }
  const unique = new Map();
  for (const item of found) unique.set(`${item.vendorId}:${item.offset}`, item);
  return [...unique.values()];
}

function walkTextFiles(rootDir, relativeRoots = REPO_ROOTS) {
  const output = [];
  function walk(absolute) {
    if (!fs.existsSync(absolute)) return;
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || (entry.isDirectory() && SKIP_DIRS.has(entry.name))) continue;
      const full = path.join(absolute, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) && fs.statSync(full).size <= 2_000_000) output.push(full);
    }
  }
  for (const relative of relativeRoots) walk(path.join(rootDir, relative));
  return output;
}

function scanRepository({ rootDir, vendors, roots = REPO_ROOTS }) {
  const evidence = [];
  for (const file of walkTextFiles(rootDir, roots)) {
    const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    for (const mention of findVendorMentions(content, vendors)) {
      const line = content.slice(0, mention.offset).split(/\r?\n/).length;
      const publiclyVisible = /^(src|public|studio)\//.test(relativePath);
      evidence.push({
        kind: 'repository', vendorId: mention.vendorId, vendorName: mention.vendorName,
        sourceLocator: `${relativePath}:${line}`, sourceUrl: null, observedAt: new Date().toISOString(),
        alias: mention.alias, excerpt: mention.excerpt, publiclyVisible,
      });
    }
  }
  return evidence;
}

function instagramPosts(exported) {
  if (Array.isArray(exported)) return exported;
  for (const key of ['posts', 'items', 'data', 'media']) if (Array.isArray(exported?.[key])) return exported[key];
  return [];
}

function normalizeInstagramPost(post) {
  const id = String(post.id || post.media_id || post.pk || post.shortcode || post.code || '').trim();
  const captionValue = post.caption?.text || post.caption || post.text || post.description || '';
  const caption = normalizeText(captionValue);
  const shortcode = post.shortcode || post.code;
  const permalink = post.permalink || post.url || (shortcode ? `https://www.instagram.com/p/${shortcode}/` : null);
  const rawObservedAt = post.timestamp || post.taken_at || post.created_time || post.createdAt;
  const observedAt = typeof rawObservedAt === 'number'
    ? new Date(rawObservedAt < 10_000_000_000 ? rawObservedAt * 1000 : rawObservedAt).toISOString()
    : (rawObservedAt || new Date().toISOString());
  return {
    id: id || stableHash(`${permalink || ''}|${caption}`).slice(0, 24), caption, permalink,
    observedAt,
    rawType: post.media_type || post.type || null,
  };
}

function scanInstagramExport(exported, vendors) {
  const evidence = [];
  for (const raw of instagramPosts(exported)) {
    const post = normalizeInstagramPost(raw);
    for (const mention of findVendorMentions(post.caption, vendors)) evidence.push({
      kind: 'instagram', vendorId: mention.vendorId, vendorName: mention.vendorName,
      sourceLocator: post.id, sourceUrl: post.permalink, observedAt: post.observedAt,
      alias: mention.alias, excerpt: mention.excerpt, publiclyVisible: true, mediaType: post.rawType,
    });
  }
  return evidence;
}

function evidenceKey(item) {
  return stableHash([item.kind, item.sourceLocator, item.vendorId, item.excerpt].join('|'));
}

async function loadVendors(prisma = getPrisma()) {
  return prisma.brainEntity.findMany({
    where: { entityType: { in: ['Vendor', 'Supplier'] }, tombstonedAt: null },
    select: { id: true, name: true, aliases: { select: { alias: true } } },
  });
}

async function projectEvidence(items, { apply = false, prisma = getPrisma(), logger } = {}) {
  const result = { candidates: items.length, ledgerEvents: 0, assertions: 0, existing: 0 };
  if (!apply) return result;
  for (const item of items) {
    const key = evidenceKey(item);
    const event = await writeLedgerEvent({
      eventType: 'partner.evidence.observed', source: item.kind === 'instagram' ? 'instagram_export' : 'repository', sourceId: key,
      occurredAt: item.observedAt, updatePayload: true,
      payload: { evidenceKey: key, vendorEntityId: item.vendorId, vendorName: item.vendorName, locator: item.sourceLocator,
        sourceUrl: item.sourceUrl, alias: item.alias, excerpt: item.excerpt, publiclyVisible: item.publiclyVisible,
        relationshipHint: 'MENTIONED_IN_CONTENT', provisional: true },
    });
    if (event._existing) result.existing++; else result.ledgerEvents++;
    const artifact = await findOrCreateEntity({
      entityType: item.kind === 'instagram' ? 'SocialPost' : 'ContentArtifact',
      name: `${item.kind}:${item.sourceLocator}`,
      properties: { source: item.kind, locator: item.sourceLocator, url: item.sourceUrl, publiclyVisible: item.publiclyVisible },
    });
    if (!artifact.entity) continue;
    const existing = await prisma.brainAssertion.findFirst({
      where: { srcId: artifact.entity.id, dstId: item.vendorId, relType: 'MENTIONS', sourceId: event.id, retractedAt: null }, select: { id: true },
    });
    if (!existing) {
      await prisma.brainAssertion.create({ data: {
        srcId: artifact.entity.id, dstId: item.vendorId, relType: 'MENTIONS', sourceType: 'ledger_event', sourceId: event.id,
        createdBy: 'partner_evidence_projector', provisional: true, confidence: item.kind === 'instagram' ? 0.72 : 0.55,
        validFrom: new Date(item.observedAt), metadata: { evidenceKey: key, source: item.kind, locator: item.sourceLocator,
          sourceUrl: item.sourceUrl, excerpt: item.excerpt, publiclyVisible: item.publiclyVisible },
      } });
      result.assertions++;
    } else result.existing++;
  }
  logger?.info?.(result, 'brain/partners: evidence projection complete');
  return result;
}

module.exports = { REPO_ROOTS, stableHash, findVendorMentions, scanRepository, normalizeInstagramPost,
  scanInstagramExport, evidenceKey, loadVendors, projectEvidence };
