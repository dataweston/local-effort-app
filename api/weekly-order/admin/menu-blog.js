/**
 * POST /api/weekly-order/admin/menu-blog
 *
 * Takes a menuWeekId, aggregates all dishes across all clients (deduplicated,
 * anonymized — no client names), then creates a Sanity blogPost document as a
 * weekly meal prep journal entry.
 *
 * Claude writes the intro paragraph. The dish list becomes Portable Text blocks.
 * The post is created in draft state (not published) so you can review in Sanity
 * Studio before publishing.
 *
 * Body: { menuWeekId: "uuid", publish: false }
 * Response: { ok, sanityDocId, slug, studioUrl }
 */

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { getSanityClient } = require('../../../backend/api/sanityClient');

const ADMIN_TOKEN = process.env.WEEKLY_ORDER_ADMIN_TOKEN || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

const safeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const checkAdmin = (req) => {
  if (!ADMIN_TOKEN) return false;
  const header = req.headers['x-admin-token'] || '';
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return safeEqual(header, ADMIN_TOKEN) || safeEqual(bearer, ADMIN_TOKEN);
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDateShort(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Build a Portable Text block array from dishes
function buildPortableTextBody(introText, dishes) {
  const blocks = [];

  // Intro paragraph from Claude
  blocks.push({
    _type: 'block',
    _key: 'intro',
    style: 'normal',
    children: [{ _type: 'span', _key: 'intro-span', text: introText, marks: [] }],
    markDefs: [],
  });

  // Section header
  blocks.push({
    _type: 'block',
    _key: 'menu-header',
    style: 'h2',
    children: [{ _type: 'span', _key: 'menu-header-span', text: "This Week's Menu", marks: [] }],
    markDefs: [],
  });

  // One block per dish
  dishes.forEach((dish, i) => {
    const dishText = dish.description
      ? `${dish.title} — ${dish.description}`
      : dish.title;

    blocks.push({
      _type: 'block',
      _key: `dish-title-${i}`,
      style: 'normal',
      children: [
        { _type: 'span', _key: `dish-title-span-${i}`, text: dish.title, marks: ['strong'] },
        ...(dish.description
          ? [{ _type: 'span', _key: `dish-desc-span-${i}`, text: ` — ${dish.description}`, marks: [] }]
          : []),
      ],
      markDefs: [],
    });
  });

  // Closing note
  blocks.push({
    _type: 'block',
    _key: 'closing',
    style: 'normal',
    children: [{
      _type: 'span',
      _key: 'closing-span',
      text: 'Interested in meal prep? Reach out to learn more about our weekly service.',
      marks: [],
    }],
    markDefs: [],
  });

  return blocks;
}

async function generateIntro(weekLabel, dishes) {
  if (!ANTHROPIC_API_KEY) return `Here's what we cooked up for the week of ${weekLabel}.`;

  const dishList = dishes.map(d => d.description ? `${d.title} (${d.description})` : d.title).join(', ');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Write a 2-3 sentence warm, conversational intro paragraph for a meal prep blog post for the week of ${weekLabel}.
The dishes this week are: ${dishList}.
Focus on the season, the ingredients, or the spirit of the week. Don't list the dishes — the list follows.
Don't use marketing clichés. Write like a home cook who also happens to run a small meal prep business.
Respond with ONLY the paragraph text, no quotes or labels.`,
      }],
    }),
  });

  if (!res.ok) return `Here's what we cooked up for the week of ${weekLabel}.`;
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || `Here's what we cooked up for the week of ${weekLabel}.`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!prisma) return res.status(500).json({ error: 'Database not configured' });

  const sanity = getSanityClient();
  if (!sanity) return res.status(500).json({ error: 'Sanity not configured' });

  const { menuWeekId, publish = false } = req.body || {};
  if (!menuWeekId) return res.status(400).json({ error: 'menuWeekId required' });

  // Load the menu week and all its dishes
  const menuWeek = await prisma.menuWeek.findUnique({
    where: { id: menuWeekId },
    include: {
      items: {
        where: { isVisible: true },
        include: {
          dish: { select: { id: true, title: true, description: true, tags: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!menuWeek) return res.status(404).json({ error: 'MenuWeek not found' });

  // Deduplicate dishes (multiple clients may share the same dish)
  const seen = new Set();
  const dishes = menuWeek.items
    .map(item => item.dish)
    .filter(dish => {
      if (!dish || seen.has(dish.id)) return false;
      seen.add(dish.id);
      return true;
    });

  if (dishes.length === 0) {
    return res.status(400).json({ error: 'No visible dishes on this menu week' });
  }

  const weekLabel = formatDateShort(menuWeek.weekStart);
  const postTitle = `Week of ${weekLabel}`;
  const baseSlug = slugify(`meal-prep-week-of-${weekLabel}`);

  // Check for slug collision and append suffix if needed
  let slug = baseSlug;
  const existing = await sanity.fetch(
    `*[_type == "blogPost" && slug.current == $slug][0]._id`,
    { slug }
  );
  if (existing) slug = `${baseSlug}-2`;

  const intro = await generateIntro(weekLabel, dishes);
  const body = buildPortableTextBody(intro, dishes);

  const excerpt = `This week's meal prep: ${dishes.slice(0, 3).map(d => d.title).join(', ')}${dishes.length > 3 ? `, and ${dishes.length - 3} more` : ''}.`;

  const doc = {
    _type: 'blogPost',
    title: postTitle,
    slug: { _type: 'slug', current: slug },
    excerpt,
    publishedAt: publish ? new Date(menuWeek.weekStart).toISOString() : undefined,
    body,
  };

  // Remove undefined keys (publishedAt when not publishing)
  Object.keys(doc).forEach(k => doc[k] === undefined && delete doc[k]);

  let created;
  try {
    created = await sanity.create(doc);
  } catch (err) {
    console.error('[menu-blog] Sanity create error', err);
    return res.status(502).json({ error: 'Failed to create Sanity document', detail: err.message });
  }

  const projectId = process.env.SANITY_PROJECT_ID || 'd6l9d0ea';
  const dataset = process.env.SANITY_DATASET || 'localeffort';
  const studioUrl = `https://www.sanity.io/manage/project/${projectId}/studio/${dataset}/desk/blogPost;${created._id}`;

  return res.status(200).json({
    ok: true,
    sanityDocId: created._id,
    slug,
    title: postTitle,
    dishCount: dishes.length,
    studioUrl,
  });
};
