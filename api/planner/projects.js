const { PrismaClient } = require('@prisma/client');
const { verifySupabaseToken } = require('./_auth');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

const CANONICAL_PROJECTS = [
  { slug: 'weekly-ops',              title: 'Weekly Ops',              color: '#6b7c3f', sortOrder: 0, description: 'Menu cycles, dish assignments, weekly prep' },
  { slug: 'subscriber-fulfillment',  title: 'Subscriber Fulfillment',  color: '#4a7c9e', sortOrder: 1, description: 'Order processing, deliveries, subscriber issues' },
  { slug: 'vendor-relations',        title: 'Vendor Relations',        color: '#b07d3a', sortOrder: 2, description: 'Purchase orders, price changes, delivery issues' },
  { slug: 'kitchen-staffing',        title: 'Kitchen Staffing',        color: '#9e4a4a', sortOrder: 3, description: 'Shifts, labor targets, training' },
  { slug: 'happy-monday',            title: 'Happy Monday / Partners', color: '#7c4a9e', sortOrder: 4, description: 'Wholesale order pipeline, partner management' },
  { slug: 'brain-systems',           title: 'Brain / Systems',         color: '#4a5568', sortOrder: 5, description: 'Feature backlog and development work' },
];

const CANONICAL_SPACES = [
  { key: 'all-hands',              title: 'All Hands',              visibility: 'staff',   sortOrder: 0 },
  { key: 'kitchen',               title: 'Kitchen',                visibility: 'staff',   sortOrder: 1 },
  { key: 'admin',                 title: 'Admin',                  visibility: 'admin',   sortOrder: 2 },
  { key: 'ops-alerts',            title: 'Ops Alerts',             visibility: 'admin',   sortOrder: 3 },
  { key: 'menu-announcements',    title: 'Menu Announcements',     visibility: 'customer', sortOrder: 4 },
  { key: 'chef-notes',            title: 'Chef Notes',             visibility: 'customer', sortOrder: 5 },
  { key: 'partner-announcements', title: 'Partner Announcements',  visibility: 'staff',   sortOrder: 6 },
];

function mapProject(p) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    color: p.color,
    spaceKey: p.spaceKey,
    targetDate: p.targetDate,
    sortOrder: p.sortOrder,
  };
}

module.exports = async (req, res) => {
  if (!prisma) return res.status(500).json({ error: 'Database not configured' });

  const user = await verifySupabaseToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const uid = user.id;

  if (req.method === 'GET') {
    const projects = await prisma.plannerProject.findMany({
      where: { supabaseUid: uid },
      orderBy: { sortOrder: 'asc' },
    });
    return res.status(200).json({ projects: projects.map(mapProject) });
  }

  if (req.method === 'POST') {
    const { action, project, projectId } = req.body || {};

    if (action === 'seed-defaults') {
      await seedDefaultProjects(uid, prisma);
      await seedHubSpaces(prisma);
      const projects = await prisma.plannerProject.findMany({
        where: { supabaseUid: uid },
        orderBy: { sortOrder: 'asc' },
      });
      return res.status(200).json({ ok: true, projects: projects.map(mapProject) });
    }

    if (action === 'create' && project?.title) {
      const slug = project.slug || slugify(project.title);
      const created = await prisma.plannerProject.create({
        data: {
          supabaseUid: uid,
          slug,
          title: project.title,
          description: project.description ?? null,
          color: project.color ?? null,
          spaceKey: project.spaceKey ?? null,
          targetDate: project.targetDate ?? null,
          sortOrder: project.sortOrder ?? 0,
        },
      });
      return res.status(201).json({ ok: true, project: mapProject(created) });
    }

    if (action === 'update' && projectId && project) {
      const updated = await prisma.plannerProject.updateMany({
        where: { id: projectId, supabaseUid: uid },
        data: {
          ...(project.title !== undefined && { title: project.title }),
          ...(project.description !== undefined && { description: project.description }),
          ...(project.color !== undefined && { color: project.color }),
          ...(project.spaceKey !== undefined && { spaceKey: project.spaceKey }),
          ...(project.targetDate !== undefined && { targetDate: project.targetDate }),
          ...(project.sortOrder !== undefined && { sortOrder: project.sortOrder }),
        },
      });
      return res.status(200).json({ ok: true, count: updated.count });
    }

    if (action === 'delete' && projectId) {
      await prisma.plannerProject.deleteMany({ where: { id: projectId, supabaseUid: uid } });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function seedDefaultProjects(uid, prisma) {
  for (const p of CANONICAL_PROJECTS) {
    await prisma.plannerProject.upsert({
      where: { supabaseUid_slug: { supabaseUid: uid, slug: p.slug } },
      update: { title: p.title, color: p.color, description: p.description, sortOrder: p.sortOrder },
      create: { supabaseUid: uid, ...p },
    });
  }
}

async function seedHubSpaces(prisma) {
  let org = await prisma.hubOrganization.findFirst({ where: { slug: 'local-effort' } });
  if (!org) {
    org = await prisma.hubOrganization.create({
      data: { name: 'Local Effort', slug: 'local-effort' },
    });
  }

  for (const s of CANONICAL_SPACES) {
    const existing = await prisma.hubSpace.findFirst({
      where: { organizationId: org.id, key: s.key },
    });
    if (!existing) {
      await prisma.hubSpace.create({
        data: {
          organizationId: org.id,
          key: s.key,
          title: s.title,
          visibility: s.visibility,
        },
      });
    }
  }
}
