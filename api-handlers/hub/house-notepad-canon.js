/**
 * Hub House Notepad canonicalizer — formalize the Today-tab house notepad's three
 * subheadings against the knowledge graph.
 *
 * SOURCE: the shared House Notepad (HubDocument source='drafts',
 * sourceId='hub-home-notepad'), the same doc shown identically on every Today tab
 * (customer, staff, privileged). It carries three subheadings:
 *
 *     #in season#            in-stock / in-season OPTIONS palette (feeds the menu)
 *     #events#               upcoming events
 *     #important updates#    house notices
 *
 * Each subheading's lines are canonicalized. `#in season#` lines resolve to
 * canonical brain `Dish`/`Ingredient` options (this is the palette Weston draws
 * from when writing the Thursday menu on the Meal Prep tab). The other two are
 * surfaced as parsed items for now (no entity type to resolve against yet).
 *
 * Read-only: this reports canonicalization; it does not mutate the notepad.
 *
 *   GET  /api/hub/house-notepad-canon   → read-only parse + match
 *   POST /api/hub/house-notepad-canon   → parse + CREATE missing in-season dishes (staff only)
 *
 *     sections: { inSeason, events, updates }
 *     inSeason[]: { text, dishEntityId, canonicalName, confidence, method, resolved, created, candidates }
 *     events[] / updates[]: { text }
 */

const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed } = require('./_http');
const { resolveDishNames, resolveOrCreateDishes } = require('../../backend/api/brain/dishResolver');
const { linesUnderSection } = require('./_notepadParse');


const NOTE_SOURCE = 'drafts';
const NOTE_SOURCE_ID = 'hub-home-notepad';

async function loadBody() {
  const doc = await prisma.hubDocument.findUnique({
    where: { source_sourceId: { source: NOTE_SOURCE, sourceId: NOTE_SOURCE_ID } },
  });
  return doc?.body || '';
}

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  // The House Notepad is visible on every Today tab, so customers may read it too;
  // a GET is just a read over the same shared doc.
  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { allowedAccess: ['staff', 'privileged', 'customer'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  // POST = commit (create missing in-season dishes); staff-only mutation.
  const commit = req.method === 'POST';
  if (commit && auth.isCustomer && !auth.isPrivileged) {
    return res.status(403).json({ error: 'Staff access required' });
  }

  try {
    const body = await loadBody();
    const inSeasonLines = linesUnderSection(body, 'in season');
    const events = linesUnderSection(body, 'events').map((text) => ({ text }));
    const updates = linesUnderSection(body, 'important updates').map((text) => ({ text }));

    // Resolve the in-stock options to canonical dishes. Only staff/privileged see
    // the brain detail; customers get the plain text without resolution noise.
    const showCanon = !auth.isCustomer || auth.isPrivileged;
    let inSeason;
    if (showCanon) {
      const resolutions = commit
        ? await resolveOrCreateDishes(inSeasonLines, { prisma, createdBy: auth.viewer.email || 'staff', menuContext: { source: 'in-season' } })
        : await resolveDishNames(inSeasonLines, { prisma });
      inSeason = inSeasonLines.map((text, i) => {
        const r = resolutions[i] || {};
        return {
          text,
          dishEntityId: r.dishEntityId || null,
          canonicalName: r.name || null,
          confidence: r.confidence ?? 0,
          method: r.method || 'none',
          resolved: !!r.dishEntityId,
          created: !!r.created,
          candidates: r.candidates || [],
        };
      });
    } else {
      inSeason = inSeasonLines.map((text) => ({ text, resolved: false }));
    }

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      mode: showCanon ? 'staff' : 'customer',
      committed: commit,
      sections: { inSeason, events, updates },
    });
  } catch (err) {
    console.error('[hub/house-notepad-canon] error', err);
    return res.status(500).json({ error: 'Unable to canonicalize house notepad' });
  }
}

module.exports = handler;
