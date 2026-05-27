const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

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
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
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
    const visibility = cleanString(req.body?.visibility, 40) === 'privileged' ? 'privileged' : 'staff';
    const category = cleanString(req.body?.category, 80) || 'general';
    const tags = Array.isArray(req.body?.tags)
      ? req.body.tags.map((tag) => cleanString(tag, 40)).filter(Boolean).slice(0, 20)
      : [];

    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });

    const source = cleanString(req.body?.source, 80) || 'manual';
    const sourceId = cleanString(req.body?.sourceId, 160);
    const payload = {
        title,
        body,
        summary,
        visibility,
        category,
        tags,
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
