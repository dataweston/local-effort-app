/**
 * Hybrid semantic search over brain entities + inbox items.
 *
 * POST /api/brain/search  — admin only
 *   body: { query: string, limit?: number, table?: 'entity'|'inbox' }
 *   returns: { ok, results: [{ id, table, text, score, metadata }] }
 *
 * Delegates to Python sidecar for vector search (LanceDB + Voyage AI).
 * Falls back to Postgres ILIKE keyword search if sidecar unavailable.
 */

const { spawn } = require('child_process');
const path = require('path');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { getPrisma } = require('../utils/prisma');

const verifyAdminRequest = createAdminVerifier();
const SIDECAR_DIR = path.resolve(__dirname, '../../../brain-sidecar');

async function vectorSearch(query, { limit = 8, table } = {}) {
  return new Promise((resolve, reject) => {
    const pythonBin = process.env.BRAIN_PYTHON_BIN || 'python3';
    const args = ['-c', `
import sys, json, os
sys.path.insert(0, r'${SIDECAR_DIR.replace(/\\/g, '\\\\')}')
from dotenv import load_dotenv
load_dotenv()
from vector_store import VectorStore
vs = VectorStore()
results = vs.search(${JSON.stringify(query)}, limit=${limit}${table ? `, table_filter=${JSON.stringify(table)}` : ''})
print(json.dumps(results))
`];

    const child = spawn(pythonBin, args, {
      env: { ...process.env },
      cwd: SIDECAR_DIR,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    child.on('close', code => {
      if (code !== 0) return reject(new Error(stderr.slice(0, 200) || 'sidecar exited ' + code));
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error('sidecar returned invalid JSON'));
      }
    });

    setTimeout(() => { child.kill(); reject(new Error('sidecar timeout')); }, 10_000);
  });
}

async function keywordFallback(prisma, query, { limit = 8, table } = {}) {
  const results = [];
  const pattern = `%${query}%`;

  if (!table || table === 'entity') {
    const entities = await prisma.brainEntity.findMany({
      where: {
        tombstonedAt: null,
        name: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      select: { id: true, entityType: true, name: true },
    });
    for (const e of entities) {
      results.push({
        id: `entity:${e.id}`,
        table: 'entity',
        text: `${e.entityType}: ${e.name}`,
        score: null,
        metadata: { entityId: e.id, entityType: e.entityType, name: e.name },
      });
    }
  }

  if (!table || table === 'inbox') {
    const items = await prisma.brainInboxItem.findMany({
      where: {
        status: 'pending',
        rawContent: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      select: { id: true, rawContent: true, source: true, status: true },
    });
    for (const item of items) {
      results.push({
        id: `inbox:${item.id}`,
        table: 'inbox',
        text: item.rawContent.slice(0, 200),
        score: null,
        metadata: { inboxId: item.id, source: item.source, status: item.status },
      });
    }
  }

  return results.slice(0, limit);
}

function registerSearchRoutes(app, { logger } = {}) {
  const prisma = getPrisma();

  app.post('/api/brain/search', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      const { query, limit = 8, table } = req.body || {};
      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'query required' });
      }

      let results;
      let method = 'vector';

      try {
        results = await vectorSearch(query.trim(), { limit, table });
      } catch (err) {
        logger?.warn({ err }, 'brain/search: vector search failed, falling back to keyword');
        method = 'keyword';
        results = await keywordFallback(prisma, query.trim(), { limit, table });
      }

      return res.json({ ok: true, query, method, results });
    } catch (err) {
      logger?.error({ err }, 'brain/search error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerSearchRoutes };
