#!/usr/bin/env node
/**
 * Import the recovered-menu catalog (.tmp/menu-recovery/catalog.json, produced
 * from scripts/recover-gmail-menus.cjs) into the menu library.
 *
 *   node scripts/import-menu-library.cjs            # report only
 *   node scripts/import-menu-library.cjs --apply    # write
 *
 * Idempotent and non-destructive: existing dishes (by slug) and menus (by
 * sourceKey) are never overwritten, so owner edits in the hub survive a re-run.
 * A pre-existing weekly-order Dish with the same title is adopted (library
 * fields set) instead of duplicated; its title, description and status stay.
 * Everything imports as libraryVisibility "internal"; nothing becomes public.
 * Diet tags are model inferences and go to dietsInferred, never to diets.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '.tmp', 'menu-recovery', 'catalog.json');
const SOURCE_ID = 'gmail-menu-recovery';
const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'menu';

function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  const { dishes, menus } = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const host = (process.env.DATABASE_URL || '').replace(/^.*@/, '').replace(/\?.*$/, '');
  console.log(`target database: ${host}`);
  console.log(`catalog: ${dishes.length} dishes, ${menus.length} menus; mode: ${apply ? 'APPLY' : 'report only'}`);

  const existing = await prisma.dish.findMany({ select: { id: true, title: true, slug: true, inLibrary: true } });
  const bySlug = new Map(existing.filter((d) => d.slug).map((d) => [d.slug, d]));
  const byTitle = new Map();
  for (const d of existing) if (!d.slug && !byTitle.has(norm(d.title))) byTitle.set(norm(d.title), d);

  if (apply) {
    const backup = path.join(ROOT, '.tmp', 'menu-recovery', `backup-dishes-${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify(await prisma.dish.findMany(), null, 1));
    console.log(`backup of ${existing.length} existing Dish rows: ${path.relative(ROOT, backup)}`);
  }

  const counts = { dishCreated: 0, dishAdopted: 0, dishExisting: 0, linkCreated: 0, menuCreated: 0, menuExisting: 0, itemsCreated: 0 };
  const idBySlug = new Map();
  // Slugs are unique across Dish; avoid colliding with a non-library dish already holding a slug.
  for (const c of dishes) {
    const facets = {
      courses: c.courses, proteins: c.proteins, dietsInferred: c.dietsInferred, seasons: c.seasons,
      cuisines: c.cuisines, components: c.components, formats: c.formats, programs: c.programs,
      variantSlugs: c.variants || [],
    };
    const found = bySlug.get(c.slug);
    if (found) { counts.dishExisting++; idBySlug.set(c.slug, found.id); continue; }
    const adopt = byTitle.get(norm(c.title));
    if (adopt) {
      counts.dishAdopted++;
      if (apply) {
        await prisma.dish.update({ where: { id: adopt.id }, data: { slug: c.slug, inLibrary: true, ...facets } });
      }
      idBySlug.set(c.slug, adopt.id);
      byTitle.delete(norm(c.title));
      continue;
    }
    counts.dishCreated++;
    if (apply) {
      const row = await prisma.dish.create({
        data: { title: c.title, description: c.description, slug: c.slug, inLibrary: true, status: 'active', libraryVisibility: 'internal', ...facets },
      });
      idBySlug.set(c.slug, row.id);
    }
  }

  if (apply) {
    // Provenance: one link per dish per source thread, so privileged users can open the email.
    const links = [];
    const seen = new Set();
    const threadsByDish = new Map();
    for (const m of menus) for (const s of m.sections) for (const it of s.items) {
      const key = `${m.threadId}#${it.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ dishId: idBySlug.get(it.slug), sourceId: SOURCE_ID, externalKey: key });
      threadsByDish.set(it.slug, (threadsByDish.get(it.slug) || 0) + 1);
    }
    for (let i = 0; i < links.length; i += 500) {
      const r = await prisma.dishSourceLink.createMany({ data: links.slice(i, i + 500), skipDuplicates: true });
      counts.linkCreated += r.count;
    }
  }

  const perThread = new Map();
  for (const m of menus) {
    const n = (perThread.get(m.threadId) || 0) + 1;
    perThread.set(m.threadId, n);
    const sourceKey = `${SOURCE_ID}:${m.threadId}#${n}`;
    const has = apply ? await prisma.libraryMenu.findUnique({ where: { sourceKey }, select: { id: true } }) : null;
    if (has) { counts.menuExisting++; continue; }
    counts.menuCreated++;
    if (!apply) continue;
    const program = m.category === 'meal_prep' ? 'meal-prep' : m.category === 'other' ? 'cafe' : 'events';
    const row = await prisma.libraryMenu.create({
      data: {
        slug: `${slugify(m.title || m.client || 'menu')}-${m.threadId.slice(-6)}-${n}`,
        title: m.title || m.client || 'Menu',
        kind: 'archive', program, occasion: m.category, clientLabel: m.client || null, status: m.status || null,
        eventDateText: m.eventDate || null, guests: m.guests || null, priceNote: m.pricing || null, notes: m.notes || null,
        sourceKey, sourceThreadId: m.threadId, occurredAt: parseDate(m.threadFirst), visibility: 'internal',
      },
    });
    let position = 0;
    const items = [];
    for (const s of m.sections) for (const it of s.items) {
      items.push({ menuId: row.id, dishId: idBySlug.get(it.slug), course: s.course, wording: it.wording, position: position++ });
    }
    const r = await prisma.libraryMenuItem.createMany({ data: items });
    counts.itemsCreated += r.count;
  }

  if (apply && (counts.dishCreated || counts.menuCreated)) {
    const { writeLedgerEvent } = require('../backend/api/brain/ledger');
    await writeLedgerEvent({
      eventType: 'menu_library.imported', occurredAt: new Date(), source: SOURCE_ID,
      sourceId: `import-${new Date().toISOString()}`, actorType: 'script', actorId: 'import-menu-library.cjs',
      payload: counts, prismaClient: prisma,
    });
  }
  console.log(JSON.stringify(counts, null, 2));
  if (!apply) console.log('report only: re-run with --apply to write');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
