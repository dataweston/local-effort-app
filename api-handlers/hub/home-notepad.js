/**
 * Hub Home notepad — a single shared staff/privileged note that lives on the
 * Home (Today) tab, mirroring the Weekly Meal Prep shared-notes pattern. Backed
 * by one HubDocument (source='drafts', sourceId='hub-home-notepad'). Staff and
 * privileged can read and edit; customers have no access.
 *
 *   GET  /api/hub/home-notepad   → { ok, note: { body, updatedAt } }
 *   POST /api/hub/home-notepad   → { ok, note }  (body: { body })
 */

const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const NOTE_SOURCE = 'drafts';
const NOTE_SOURCE_ID = 'hub-home-notepad';
const NOTE_TITLE = 'Hub Home Notepad';

// Default template seeded the first time the notepad is opened. Uses #heading#
// markers to match the shared house style of the meal-prep notepad.
const DEFAULT_TEMPLATE = [
  '#in season#',
  '- ',
  '',
  '#events#',
  '- ',
  '',
  '#important updates#',
  '- ',
  '',
].join('\n');

function publicDoc(doc) {
  return {
    body: doc?.body ?? DEFAULT_TEMPLATE,
    updatedAt: asIso(doc?.updatedAt) || null,
    seeded: !doc,
  };
}

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  // Staff and privileged only — customers do not see or edit the house notepad.
  const denied = requireHubAccess(auth, { allowedAccess: ['staff', 'privileged'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    if (req.method === 'POST') {
      const body = typeof req.body?.body === 'string' ? req.body.body.slice(0, 40_000) : '';
      const payload = {
        title: NOTE_TITLE,
        body,
        summary: 'Shared hub home notepad for staff and privileged users.',
        visibility: 'staff',
        category: 'hub-home',
        tags: ['hub-home', 'drafts'],
        createdByUserId: auth.viewer.userId || null,
      };
      const doc = await prisma.hubDocument.upsert({
        where: { source_sourceId: { source: NOTE_SOURCE, sourceId: NOTE_SOURCE_ID } },
        update: payload,
        create: { ...payload, source: NOTE_SOURCE, sourceId: NOTE_SOURCE_ID },
      });
      return res.status(200).json({ ok: true, note: publicDoc(doc) });
    }

    const doc = await prisma.hubDocument.findUnique({
      where: { source_sourceId: { source: NOTE_SOURCE, sourceId: NOTE_SOURCE_ID } },
    });
    return res.status(200).json({ ok: true, note: publicDoc(doc) });
  } catch (err) {
    console.error('[hub/home-notepad] error', err);
    return res.status(500).json({ error: 'Unable to load home notepad' });
  }
}

module.exports = handler;
module.exports._internals = { DEFAULT_TEMPLATE, NOTE_SOURCE_ID };
