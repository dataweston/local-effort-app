/**
 * Hub menu library: the canonical dish and menu catalog (Prisma Dish + LibraryMenu).
 * See docs/menu-library-spec.md.
 *
 *   GET  /api/hub/menu-library                      catalog (dishes the viewer may see)
 *   GET  /api/hub/menu-library?view=dish&id=<id|slug>   one dish, with variation timeline
 *   GET  /api/hub/menu-library?view=menus           menus list
 *   GET  /api/hub/menu-library?view=menu&id=<id>    one menu with sections
 *   POST /api/hub/menu-library  { action, ... }     see ACTIONS below
 *
 * Visibility: privileged sees everything incl. email provenance and client labels;
 * staff sees all dishes and non-archive menus (no client names, no email links);
 * customers and localists see only dishes marked "clients" or "public" and
 * non-archive menus marked likewise. Inferred diet tags are staff-only.
 */

const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed } = require('./_http');
const vocab = require('../../src/config/menuVocabulary.json');

const ids = (list) => new Set(list.map((v) => v.id));
const FACETS = {
  courses: ids(vocab.courses), proteins: ids(vocab.proteins), diets: ids(vocab.diets), seasons: ids(vocab.seasons),
  formats: ids(vocab.formats), programs: ids(vocab.programs),
};
const VISIBILITY = ids(vocab.visibility);
const MENU_KINDS = ids(vocab.menuKinds);
const MAX_TEXT = 4000;

function text(value, max = MAX_TEXT) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v ? v.slice(0, max) : null;
}

function facetList(name, value) {
  if (!Array.isArray(value)) throw Object.assign(new Error(`${name} must be an array`), { status: 400 });
  const out = [...new Set(value.map(String))];
  const bad = out.filter((v) => !FACETS[name].has(v));
  if (bad.length) throw Object.assign(new Error(`Unknown ${name}: ${bad.join(', ')}`), { status: 400 });
  return out;
}

function freeList(value) {
  if (!Array.isArray(value)) throw Object.assign(new Error('list expected'), { status: 400 });
  return [...new Set(value.map((v) => String(v).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'dish';
}

function levels(auth) {
  return { privileged: !!auth.isPrivileged, staff: !!auth.isStaff };
}

function dishVisibilityWhere(lv) {
  if (lv.staff) return { inLibrary: true };
  return { inLibrary: true, status: 'active', libraryVisibility: { in: ['clients', 'public'] } };
}

function shapeDish(d, lv, usage) {
  const out = {
    id: d.id, slug: d.slug, title: d.title, description: d.description,
    courses: d.courses, proteins: d.proteins, diets: d.diets, seasons: d.seasons,
    cuisines: d.cuisines, components: d.components, formats: d.formats, programs: d.programs,
    visibility: d.libraryVisibility, status: d.status,
  };
  if (lv.staff) {
    out.dietsInferred = d.dietsInferred;
    out.dietsVerifiedAt = d.dietsVerifiedAt;
    out.variantSlugs = d.variantSlugs;
    out.allergens = d.allergens;
    if (usage) {
      out.timesServed = usage.times;
      out.lastServed = usage.last;
    }
  }
  return out;
}

async function usageByDish() {
  const rows = await prisma.$queryRaw`
    SELECT i."dishId" AS id, COUNT(DISTINCT i."menuId")::int AS times, MAX(m."occurredAt") AS last
    FROM "LibraryMenuItem" i JOIN "LibraryMenu" m ON m.id = i."menuId"
    GROUP BY i."dishId"`;
  return new Map(rows.map((r) => [r.id, { times: r.times, last: r.last ? new Date(r.last).toISOString().slice(0, 7) : null }]));
}

function menuVisibilityWhere(lv) {
  if (lv.privileged) return {};
  if (lv.staff) return { kind: { not: 'archive' } };
  return { kind: { not: 'archive' }, visibility: { in: ['clients', 'public'] } };
}

function shapeMenu(m, lv) {
  const out = {
    id: m.id, slug: m.slug, title: m.title, kind: m.kind, program: m.program, occasion: m.occasion,
    visibility: m.visibility, guests: m.guests, status: m.status,
    year: m.occurredAt ? new Date(m.occurredAt).getUTCFullYear() : null,
  };
  if (lv.privileged) {
    out.clientLabel = m.clientLabel;
    out.eventDateText = m.eventDateText;
    out.priceNote = m.priceNote;
    out.notes = m.notes;
    out.sourceThreadId = m.sourceThreadId;
  } else if (m.kind !== 'archive') {
    out.notes = m.notes;
  }
  return out;
}

async function getDish(idOrSlug, lv) {
  const dish = await prisma.dish.findFirst({
    where: { ...dishVisibilityWhere(lv), OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
  });
  if (!dish) return null;
  const out = { dish: shapeDish(dish, lv) };
  if (!lv.staff) return out;

  const items = await prisma.libraryMenuItem.findMany({
    where: { dishId: dish.id },
    include: { menu: true },
    orderBy: { menu: { occurredAt: 'desc' } },
  });
  out.timeline = items.map((i) => ({
    wording: i.wording, course: i.course, menuId: i.menuId, program: i.menu.program, occasion: i.menu.occasion,
    kind: i.menu.kind, year: i.menu.occurredAt ? new Date(i.menu.occurredAt).getUTCFullYear() : null,
    month: i.menu.occurredAt ? new Date(i.menu.occurredAt).toISOString().slice(0, 7) : null,
    ...(lv.privileged ? { menuTitle: i.menu.title, clientLabel: i.menu.clientLabel, threadId: i.menu.sourceThreadId } : {}),
  }));
  const pairings = await prisma.$queryRaw`
    SELECT d.id, d.slug, d.title, COUNT(*)::int AS together
    FROM "LibraryMenuItem" a
    JOIN "LibraryMenuItem" b ON b."menuId" = a."menuId" AND b."dishId" <> a."dishId"
    JOIN "Dish" d ON d.id = b."dishId"
    WHERE a."dishId" = ${dish.id}
    GROUP BY d.id, d.slug, d.title
    ORDER BY together DESC, d.title ASC
    LIMIT 8`;
  out.pairings = pairings;
  if (dish.variantSlugs?.length) {
    out.variants = await prisma.dish.findMany({ where: { slug: { in: dish.variantSlugs } }, select: { id: true, slug: true, title: true } });
  }
  out.feedback = await prisma.dishFeedback.groupBy({ by: ['thumbsUp'], where: { dishId: dish.id }, _count: true });
  out.preferences = await prisma.libraryDishPreference.groupBy({ by: ['kind'], where: { dishId: dish.id }, _count: true });
  return out;
}

async function getMenu(id, lv) {
  const menu = await prisma.libraryMenu.findFirst({ where: { ...menuVisibilityWhere(lv), id } });
  if (!menu) return null;
  const items = await prisma.libraryMenuItem.findMany({
    where: { menuId: id }, orderBy: { position: 'asc' },
    include: { dish: { select: { id: true, slug: true, title: true, libraryVisibility: true } } },
  });
  const sections = [];
  for (const i of items) {
    let s = sections.find((x) => x.course === i.course);
    if (!s) { s = { course: i.course, items: [] }; sections.push(s); }
    s.items.push({ dishId: i.dish.id, slug: i.dish.slug, title: i.dish.title, wording: i.wording });
  }
  return { menu: shapeMenu(menu, lv), sections };
}

async function updateDish(body) {
  const id = text(body.id, 64);
  if (!id) throw Object.assign(new Error('id required'), { status: 400 });
  const data = {};
  if (body.title !== undefined) { data.title = text(body.title, 200); if (!data.title) throw Object.assign(new Error('title required'), { status: 400 }); }
  if (body.description !== undefined) data.description = text(body.description);
  for (const f of Object.keys(FACETS)) if (body[f] !== undefined) data[f] = facetList(f, body[f]);
  if (body.cuisines !== undefined) data.cuisines = freeList(body.cuisines);
  if (body.components !== undefined) data.components = freeList(body.components);
  if (body.allergens !== undefined) data.allergens = freeList(body.allergens);
  if (body.libraryVisibility !== undefined) {
    if (!VISIBILITY.has(body.libraryVisibility)) throw Object.assign(new Error('Unknown visibility'), { status: 400 });
    data.libraryVisibility = body.libraryVisibility;
  }
  if (body.status !== undefined) {
    if (!['draft', 'active', 'archived'].includes(body.status)) throw Object.assign(new Error('Unknown status'), { status: 400 });
    data.status = body.status;
  }
  if (body.confirmInferredDiets === true) {
    // Owner confirms the model's inferred tags as stated by the kitchen.
    const current = await prisma.dish.findUnique({ where: { id }, select: { diets: true, dietsInferred: true } });
    if (!current) throw Object.assign(new Error('Dish not found'), { status: 404 });
    data.diets = [...new Set([...(data.diets || current.diets), ...current.dietsInferred])];
    data.dietsVerifiedAt = new Date();
  } else if (data.diets) {
    data.dietsVerifiedAt = new Date();
  }

  return prisma.dish.update({ where: { id }, data });
}

async function createDish(body) {
  const title = text(body.title, 200);
  if (!title) throw Object.assign(new Error('title required'), { status: 400 });
  let slug = slugify(title);
  const base = slug;
  for (let n = 2; await prisma.dish.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
  return prisma.dish.create({
    data: {
      title, slug, inLibrary: true, status: 'draft', libraryVisibility: 'internal', description: text(body.description),
      courses: body.courses ? facetList('courses', body.courses) : [],
    },
  });
}

async function mergeDishes(body) {
  const keepId = text(body.keepId, 64);
  const mergeId = text(body.mergeId, 64);
  if (!keepId || !mergeId || keepId === mergeId) throw Object.assign(new Error('keepId and different mergeId required'), { status: 400 });
  const [keep, gone] = await Promise.all([
    prisma.dish.findUnique({ where: { id: keepId } }), prisma.dish.findUnique({ where: { id: mergeId } }),
  ]);
  if (!keep || !gone) throw Object.assign(new Error('Dish not found'), { status: 404 });
  const union = (a, b) => [...new Set([...(a || []), ...(b || [])])];
  return prisma.$transaction(async (tx) => {
    await tx.libraryMenuItem.updateMany({ where: { dishId: mergeId }, data: { dishId: keepId } });
    const links = await tx.dishSourceLink.findMany({ where: { dishId: mergeId } });
    for (const l of links) {
      const clash = await tx.dishSourceLink.findFirst({ where: { dishId: keepId, sourceId: l.sourceId, externalKey: l.externalKey } });
      if (clash) await tx.dishSourceLink.delete({ where: { id: l.id } });
      else await tx.dishSourceLink.update({ where: { id: l.id }, data: { dishId: keepId } });
    }
    await tx.libraryDishPreference.deleteMany({ where: { dishId: mergeId, userId: { in: (await tx.libraryDishPreference.findMany({ where: { dishId: keepId }, select: { userId: true } })).map((p) => p.userId) } } });
    await tx.libraryDishPreference.updateMany({ where: { dishId: mergeId }, data: { dishId: keepId } });
    const blockers = await Promise.all([
      tx.orderItem.count({ where: { dishId: mergeId } }), tx.menuWeekItem.count({ where: { dishId: mergeId } }),
    ]);
    const keepData = {
      courses: union(keep.courses, gone.courses), proteins: union(keep.proteins, gone.proteins),
      diets: union(keep.diets, gone.diets), dietsInferred: union(keep.dietsInferred, gone.dietsInferred),
      seasons: union(keep.seasons, gone.seasons), components: union(keep.components, gone.components),
      formats: union(keep.formats, gone.formats), programs: union(keep.programs, gone.programs),
      variantSlugs: union(keep.variantSlugs, gone.variantSlugs).filter((s) => s !== keep.slug && s !== gone.slug),
    };
    await tx.dish.update({ where: { id: keepId }, data: keepData });
    if (blockers[0] + blockers[1] === 0) {
      await tx.dishFeedback.deleteMany({ where: { dishId: mergeId } });
      await tx.dish.delete({ where: { id: mergeId } });
    } else {
      // Has orders or weekly menus: keep the row for history but take it out of the library.
      await tx.dish.update({ where: { id: mergeId }, data: { inLibrary: false, slug: null } });
    }
    return keepId;
  });
}

async function setPreference(auth, body) {
  const userId = auth.viewer.userId;
  if (!userId) throw Object.assign(new Error('No user account linked'), { status: 400 });
  const dishId = text(body.dishId, 64);
  const kind = body.kind;
  if (!dishId || !['favorite', 'avoid', 'none'].includes(kind)) throw Object.assign(new Error('dishId and kind (favorite|avoid|none) required'), { status: 400 });
  const dish = await prisma.dish.findFirst({ where: { id: dishId, ...dishVisibilityWhere(levels(auth)) }, select: { id: true } });
  if (!dish) throw Object.assign(new Error('Dish not found'), { status: 404 });
  if (kind === 'none') await prisma.libraryDishPreference.deleteMany({ where: { userId, dishId } });
  else await prisma.libraryDishPreference.upsert({ where: { userId_dishId: { userId, dishId } }, update: { kind }, create: { userId, dishId, kind } });
  return { dishId, kind };
}

async function saveMenu(body, auth) {
  const title = text(body.title, 200);
  if (!title) throw Object.assign(new Error('title required'), { status: 400 });
  const kind = MENU_KINDS.has(body.kind) && body.kind !== 'archive' ? body.kind : 'proposal';
  const program = FACETS.programs.has(body.program) ? body.program : 'events';
  const sections = Array.isArray(body.sections) ? body.sections : [];
  const rows = [];
  for (const s of sections) {
    if (!FACETS.courses.has(s.course)) throw Object.assign(new Error(`Unknown course: ${s.course}`), { status: 400 });
    for (const it of s.items || []) {
      const dishId = text(it.dishId, 64);
      if (!dishId) continue;
      const dish = await prisma.dish.findFirst({ where: { id: dishId, inLibrary: true }, select: { id: true, title: true } });
      if (!dish) throw Object.assign(new Error('Dish not found in library'), { status: 400 });
      rows.push({ dishId, course: s.course, wording: text(it.wording, 600) || dish.title, position: rows.length });
    }
  }
  const data = {
    title, kind, program, occasion: text(body.occasion, 200), guests: text(body.guests, 80), notes: text(body.notes),
    clientLabel: text(body.clientLabel, 200), visibility: VISIBILITY.has(body.visibility) ? body.visibility : 'internal',
    status: 'draft', occurredAt: new Date(),
  };
  if (body.id) {
    const existing = await prisma.libraryMenu.findUnique({ where: { id: String(body.id) } });
    if (!existing || existing.kind === 'archive') throw Object.assign(new Error('Menu not found or archive menus are read-only'), { status: 404 });
    await prisma.libraryMenuItem.deleteMany({ where: { menuId: existing.id } });
    const { occurredAt, ...rest } = data;
    await prisma.libraryMenu.update({ where: { id: existing.id }, data: { ...rest, items: { create: rows } } });
    return existing.id;
  }
  let slug = slugify(title);
  const base = slug;
  for (let n = 2; await prisma.libraryMenu.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
  const row = await prisma.libraryMenu.create({
    data: { ...data, slug, sourceKey: `hub:${auth.viewer.userId || 'owner'}:${Date.now()}`, items: { create: rows } },
  });
  return row.id;
}

async function handler(req, res) {
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });
  const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
  const denied = requireHubAccess(auth, { allowedAccess: ['customer', 'localist', 'staff', 'privileged'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });
  const lv = levels(auth);

  try {
    if (req.method === 'GET') {
      const view = String(req.query?.view || 'catalog');
      if (view === 'dish') {
        const r = await getDish(String(req.query?.id || ''), lv);
        return r ? res.status(200).json({ ok: true, ...r }) : res.status(404).json({ error: 'Dish not found' });
      }
      if (view === 'menu') {
        const r = await getMenu(String(req.query?.id || ''), lv);
        return r ? res.status(200).json({ ok: true, ...r }) : res.status(404).json({ error: 'Menu not found' });
      }
      if (view === 'menus') {
        const menus = await prisma.libraryMenu.findMany({ where: menuVisibilityWhere(lv), orderBy: [{ occurredAt: 'desc' }, { title: 'asc' }] });
        return res.status(200).json({ ok: true, menus: menus.map((m) => shapeMenu(m, lv)) });
      }
      const [dishes, usage] = await Promise.all([
        prisma.dish.findMany({ where: dishVisibilityWhere(lv), orderBy: { title: 'asc' } }),
        lv.staff ? usageByDish() : Promise.resolve(new Map()),
      ]);
      const prefs = auth.viewer.userId
        ? await prisma.libraryDishPreference.findMany({ where: { userId: auth.viewer.userId }, select: { dishId: true, kind: true } })
        : [];
      return res.status(200).json({
        ok: true,
        role: lv.privileged ? 'privileged' : lv.staff ? 'staff' : 'client',
        dishes: dishes.map((d) => shapeDish(d, lv, usage.get(d.id))),
        preferences: Object.fromEntries(prefs.map((p) => [p.dishId, p.kind])),
      });
    }

    const body = req.body || {};
    const action = req.method === 'PATCH' ? 'update-dish' : String(body.action || '');
    if (action === 'preference') return res.status(200).json({ ok: true, ...(await setPreference(auth, body)) });

    const needsPriv = requireHubAccess(auth, { privileged: true });
    if (needsPriv) return res.status(needsPriv.status).json({ error: needsPriv.error });
    if (action === 'update-dish') {
      await updateDish(body);
      return res.status(200).json({ ok: true, ...(await getDish(String(body.id), lv)) });
    }
    if (action === 'create-dish') {
      const d = await createDish(body);
      return res.status(200).json({ ok: true, id: d.id, slug: d.slug });
    }
    if (action === 'merge') return res.status(200).json({ ok: true, keepId: await mergeDishes(body) });
    if (action === 'save-menu') return res.status(200).json({ ok: true, id: await saveMenu(body, auth) });
    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('[hub/menu-library] error', err);
    return res.status(500).json({ error: 'Menu library request failed' });
  }
}

module.exports = handler;
