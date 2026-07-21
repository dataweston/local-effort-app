const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');


function allowedVisibility(auth) {
  return auth.isPrivileged ? ['staff', 'privileged'] : ['staff'];
}

function publicDoc(doc, { includeBody = false } = {}) {
  return {
    id: doc.id,
    title: doc.title,
    summary: doc.summary || '',
    body: includeBody ? doc.body : undefined,
    visibility: doc.visibility,
    category: doc.category,
    tags: doc.tags || [],
    source: doc.source,
    status: doc.status,
    createdAt: asIso(doc.createdAt),
    updatedAt: asIso(doc.updatedAt),
  };
}

module.exports = async (req, res) => {
  if (!['GET', 'POST', 'PUT'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST', 'PUT']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  // Publishing new docs stays privileged; edits are open to any staff-level viewer.
  const denied = requireHubAccess(auth, { privileged: req.method === 'POST' });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    if (req.method === 'GET') {
      const id = cleanString(req.query?.id, 120);
      if (id) {
        const doc = await prisma.hubDocument.findFirst({
          where: {
            id,
            status: 'published',
            visibility: { in: allowedVisibility(auth) },
          },
        });
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        return res.status(200).json({ ok: true, document: publicDoc(doc, { includeBody: true }) });
      }

      const docs = await prisma.hubDocument.findMany({
        where: {
          status: 'published',
          visibility: { in: allowedVisibility(auth) },
        },
        orderBy: [{ category: 'asc' }, { updatedAt: 'desc' }],
        take: 200,
      });
      return res.status(200).json({
        ok: true,
        generatedAt: new Date().toISOString(),
        documents: docs.map((doc) => publicDoc(doc)),
      });
    }

    const title = cleanString(req.body?.title, 180);
    const body = cleanString(req.body?.body, 20_000);
    const summary = cleanString(req.body?.summary, 500);
    const category = cleanString(req.body?.category, 80);
    const requestedVisibility = cleanString(req.body?.visibility, 40);
    const tags = Array.isArray(req.body?.tags)
      ? req.body.tags.map((tag) => cleanString(tag, 40)).filter(Boolean).slice(0, 20)
      : null;

    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });

    if (req.method === 'PUT') {
      const id = cleanString(req.body?.id, 120);
      if (!id) return res.status(400).json({ error: 'id is required' });
      const existing = await prisma.hubDocument.findFirst({
        where: {
          id,
          status: 'published',
          visibility: { in: allowedVisibility(auth) },
        },
      });
      if (!existing) return res.status(404).json({ error: 'Document not found' });
      // Only privileged users may move a doc between audiences.
      const visibility = auth.isPrivileged && ['staff', 'privileged'].includes(requestedVisibility)
        ? requestedVisibility
        : existing.visibility;
      const document = await prisma.hubDocument.update({
        where: { id: existing.id },
        data: {
          title,
          body,
          summary,
          visibility,
          category: category || existing.category,
          tags: tags || existing.tags,
        },
      });
      return res.status(200).json({ ok: true, document: publicDoc(document, { includeBody: true }) });
    }

    const source = cleanString(req.body?.source, 80) || 'manual';
    const sourceId = cleanString(req.body?.sourceId, 160);
    const payload = {
        title,
        body,
        summary,
        visibility: requestedVisibility === 'privileged' ? 'privileged' : 'staff',
        category: category || 'general',
        tags: tags || [],
        source,
        sourceId,
        createdByUserId: auth.viewer.userId || null,
      };
    const document = sourceId
      ? await prisma.hubDocument.upsert({
          where: { source_sourceId: { source, sourceId } },
          update: payload,
          create: payload,
        })
      : await prisma.hubDocument.create({ data: payload });
    return res.status(201).json({ ok: true, document: publicDoc(document, { includeBody: true }) });
  } catch (err) {
    console.error('[hub/docs] error', err);
    return res.status(500).json({ error: 'Unable to manage hub documents' });
  }
};
