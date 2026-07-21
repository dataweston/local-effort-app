const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');
const docsHandler = require('./docs');


module.exports = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { privileged: true });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const sourceType = cleanString(req.body?.sourceType, 40) || 'brain_inbox';
  const sourceId = cleanString(req.body?.sourceId, 120);
  if (!sourceId) return res.status(400).json({ error: 'sourceId is required' });

  try {
    let source = null;
    if (sourceType === 'brain_entity') {
      source = await prisma.brainEntity.findUnique({ where: { id: sourceId } });
      if (!source) return res.status(404).json({ error: 'Brain entity not found' });
    } else {
      source = await prisma.brainInboxItem.findUnique({ where: { id: sourceId } });
      if (!source) return res.status(404).json({ error: 'Brain inbox item not found' });
    }

    req.body = {
      title: cleanString(req.body?.title, 180) || source.name || source.rawContent?.slice(0, 80) || 'Hub note',
      summary: cleanString(req.body?.summary, 500) || source.rawContent?.slice(0, 240) || '',
      body: cleanString(req.body?.body, 20_000) || source.rawContent || JSON.stringify(source.properties || {}, null, 2),
      visibility: cleanString(req.body?.visibility, 40) || 'staff',
      category: cleanString(req.body?.category, 80) || 'brain',
      tags: Array.isArray(req.body?.tags) ? req.body.tags : ['brain'],
      source: sourceType,
      sourceId,
    };
    return docsHandler(req, res);
  } catch (err) {
    console.error('[hub/brain-publish] error', err);
    return res.status(500).json({ error: 'Unable to publish brain item to hub' });
  }
};
