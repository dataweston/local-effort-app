/**
 * Public view of the dish library (docs/menu-library-spec.md, phase 6).
 * One shaping function feeds the generated /dishes snapshot and the public MCP tool,
 * so the two cannot disagree about what is public.
 *
 * A dish is public only when the owner set libraryVisibility = "public" and status = "active".
 * Only owner-confirmed `diets` are shown; `dietsInferred` and allergen lists never leave the hub.
 */

const vocab = require('../../src/config/menuVocabulary.json');

const PRICE_RE = /\$\s*\d|\b\d+(?:\.\d+)?\s*(?:\/|per\s+)\s*(?:p\b|pp\b|person|head|adult|kid|meal|guest)/i;

function publicDish(d) {
  return {
    slug: d.slug,
    title: d.title,
    description: d.description || '',
    courses: d.courses || [],
    proteins: d.proteins || [],
    diets: d.diets || [],
    seasons: d.seasons || [],
    formats: d.formats || [],
  };
}

async function loadPublicDishes(prisma) {
  const rows = await prisma.dish.findMany({
    where: { inLibrary: true, libraryVisibility: 'public', status: 'active', slug: { not: null } },
    orderBy: { title: 'asc' },
  });
  return rows.map(publicDish);
}

/** Words from archive client labels that must never appear in public copy. */
async function archiveClientNames(prisma) {
  const rows = await prisma.libraryMenu.findMany({ select: { clientLabel: true } });
  const names = new Set();
  for (const { clientLabel } of rows) {
    for (const w of String(clientLabel || '').split(/[^A-Za-zÀ-ÿ'’]+/)) {
      if (w.length >= 3 && w.toLowerCase() !== 'unknown') names.add(w.toLowerCase());
    }
  }
  return names;
}

/** Returns a list of problems; empty means safe to publish. */
function privacyProblems(dishes, clientNames) {
  const problems = [];
  for (const d of dishes) {
    const text = `${d.title}\n${d.description}`;
    if (PRICE_RE.test(text)) problems.push(`${d.slug}: looks like a price`);
    const words = new Set(text.toLowerCase().split(/[^a-zà-ÿ'’]+/));
    for (const n of clientNames) if (words.has(n)) problems.push(`${d.slug}: contains archive client name "${n}"`);
  }
  return problems;
}

function dietLabel(id) {
  return vocab.diets.find((x) => x.id === id)?.label || id;
}

module.exports = { publicDish, loadPublicDishes, archiveClientNames, privacyProblems, dietLabel, PRICE_RE };
