const { prisma } = require('../_lib/prisma');

const INGEST_SECRET =
  process.env.RECIPES_INGEST_SECRET ||
  process.env.WEEKLY_ORDER_INGEST_SECRET ||
  '';


const MEAL_TIME_KEYWORDS = {
  breakfast: ['breakfast', 'brunch', 'am'],
  lunch: ['lunch', 'noon'],
  dinner: ['dinner', 'supper', 'pm'],
  snack: ['snack', 'snacks'],
};

const COMPONENT_KEYWORDS = {
  protein: [
    'chicken', 'beef', 'pork', 'turkey', 'lamb', 'tofu', 'tempeh', 'salmon',
    'cod', 'tuna', 'shrimp', 'sausage', 'egg', 'eggs', 'fish',
  ],
  vegetable: [
    'broccoli', 'carrot', 'kale', 'spinach', 'cabbage', 'cauliflower',
    'zucchini', 'pepper', 'peppers', 'green beans', 'asparagus',
  ],
  side: [
    'rice', 'potato', 'potatoes', 'quinoa', 'bread', 'beans', 'lentils',
    'pasta', 'noodles', 'couscous', 'polenta',
  ],
  kids: [
    'kids', 'kid', 'toddler', 'nugget', 'tenders', 'mac', 'macaroni',
  ],
};

const DIET_TAGS = [
  { tag: 'vegetarian', keywords: ['vegetarian'] },
  { tag: 'vegan', keywords: ['vegan'] },
  { tag: 'gluten-free', keywords: ['gluten free', 'gluten-free', 'gf'] },
  { tag: 'dairy-free', keywords: ['dairy free', 'dairy-free', 'df'] },
  { tag: 'nut-free', keywords: ['nut free', 'nut-free'] },
];

const FORMAT_TAGS = [
  { tag: 'bowl', keywords: ['bowl'] },
  { tag: 'salad', keywords: ['salad'] },
  { tag: 'soup', keywords: ['soup'] },
  { tag: 'sandwich', keywords: ['sandwich'] },
  { tag: 'pasta', keywords: ['pasta'] },
  { tag: 'tacos', keywords: ['taco', 'tacos'] },
  { tag: 'stir-fry', keywords: ['stir fry', 'stir-fry'] },
];

const ALLERGEN_KEYWORDS = [
  { allergen: 'dairy', keywords: ['cheese', 'cream', 'milk', 'butter', 'yogurt'] },
  { allergen: 'wheat', keywords: ['bread', 'pasta', 'flour', 'noodles', 'bun'] },
  { allergen: 'soy', keywords: ['soy', 'tofu', 'tempeh', 'edamame'] },
  { allergen: 'nuts', keywords: ['almond', 'peanut', 'cashew', 'pistachio', 'walnut'] },
  { allergen: 'sesame', keywords: ['sesame', 'tahini'] },
  { allergen: 'fish', keywords: ['salmon', 'cod', 'tuna', 'fish'] },
  { allergen: 'shellfish', keywords: ['shrimp', 'crab', 'lobster', 'scallop'] },
  { allergen: 'egg', keywords: ['egg', 'eggs'] },
];

const normalizeTitle = (value) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const titleTokens = (value) => {
  const normalized = normalizeTitle(value);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
};

const jaccard = (aTokens, bTokens) => {
  if (!aTokens.length || !bTokens.length) return 0;
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  const intersection = [...aSet].filter((t) => bSet.has(t)).length;
  const union = new Set([...aSet, ...bSet]).size;
  return union ? intersection / union : 0;
};

const stripBullet = (line) => line.replace(/^[-*•\u2022]+\s*/, '').trim();

const parseLine = (line) => {
  const trimmed = stripBullet(line);
  if (!trimmed) return null;

  let title = trimmed;
  let description = '';
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    title = parts.shift().trim();
    description = parts.join(' - ').trim();
  } else if (trimmed.includes(' — ')) {
    const parts = trimmed.split(' — ');
    title = parts.shift().trim();
    description = parts.join(' — ').trim();
  } else if (trimmed.includes(': ') && trimmed.length > 28) {
    const parts = trimmed.split(': ');
    title = parts.shift().trim();
    description = parts.join(': ').trim();
  }

  return {
    title,
    description: description || null,
    raw: trimmed,
  };
};

const detectCategories = (text, activeCategories = []) => {
  const lower = text.toLowerCase();
  const categories = new Set(activeCategories);
  Object.entries(MEAL_TIME_KEYWORDS).forEach(([key, keywords]) => {
    if (keywords.some((word) => lower.includes(word))) categories.add(key);
  });
  Object.entries(COMPONENT_KEYWORDS).forEach(([key, keywords]) => {
    if (keywords.some((word) => lower.includes(word))) categories.add(key);
  });
  if (categories.size === 0) categories.add('other');
  return Array.from(categories);
};

const detectTags = (text) => {
  const lower = text.toLowerCase();
  const tags = new Set();
  DIET_TAGS.forEach(({ tag, keywords }) => {
    if (keywords.some((word) => lower.includes(word))) tags.add(tag);
  });
  FORMAT_TAGS.forEach(({ tag, keywords }) => {
    if (keywords.some((word) => lower.includes(word))) tags.add(tag);
  });
  return Array.from(tags);
};

const detectAllergens = (text) => {
  const lower = text.toLowerCase();
  const allergens = new Set();
  ALLERGEN_KEYWORDS.forEach(({ allergen, keywords }) => {
    if (keywords.some((word) => lower.includes(word))) allergens.add(allergen);
  });
  return Array.from(allergens);
};

const isHeading = (line) => {
  const cleaned = stripBullet(line).replace(/[:\-]+$/, '').trim();
  if (!cleaned) return false;
  if (cleaned.length > 28) return false;
  const lower = cleaned.toLowerCase();
  const headingWords = [
    ...Object.keys(MEAL_TIME_KEYWORDS),
    ...Object.keys(COMPONENT_KEYWORDS),
    'kids',
    'other',
  ];
  return headingWords.some((word) => lower.includes(word));
};

const getHeadingCategories = (line) => {
  const lower = stripBullet(line).replace(/[:\-]+$/, '').toLowerCase();
  const categories = [];
  Object.keys(MEAL_TIME_KEYWORDS).forEach((key) => {
    if (lower.includes(key)) categories.push(key);
  });
  Object.keys(COMPONENT_KEYWORDS).forEach((key) => {
    if (lower.includes(key)) categories.push(key);
  });
  if (lower.includes('kids')) categories.push('kids');
  if (lower.includes('other')) categories.push('other');
  return categories;
};

const findMatch = (candidate, dishes) => {
  const candidateTokens = titleTokens(candidate);
  if (!candidateTokens.length) return null;
  let best = { dish: null, score: 0 };
  dishes.forEach((dish) => {
    const score = jaccard(candidateTokens, titleTokens(dish.title));
    if (score > best.score) {
      best = { dish, score };
    }
  });
  if (best.score < 0.55) return null;
  return best;
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!prisma) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (INGEST_SECRET) {
    const auth = req.headers.authorization || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const token = bearer || req.headers['x-ingest-token'] || '';
    if (token !== INGEST_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const payload = req.body || {};
  const text = (payload.text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  const externalKey = payload.externalKey || null;
  if (externalKey) {
    const existing = await prisma.recipeIngest.findUnique({
      where: { externalKey },
      include: { drafts: true },
    });
    if (existing) {
      return res.status(200).json({
        ok: true,
        ingestId: existing.id,
        draftCount: existing.drafts.length,
        reused: true,
      });
    }
  }

  const ingest = await prisma.recipeIngest.create({
    data: {
      source: payload.source || 'drafts',
      externalKey,
      text,
      metadata: payload.metadata || null,
      rawPayloadJson: payload,
    },
  });

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length);

  const existingDishes = await prisma.dish.findMany({
    select: { id: true, title: true, tags: true, categories: true, allergens: true, description: true },
  });

  const seenTitles = new Set();
  let activeCategories = [];
  const drafts = [];
  const warnings = [];

  lines.forEach((line) => {
    if (isHeading(line)) {
      activeCategories = getHeadingCategories(line);
      return;
    }
    const parsed = parseLine(line);
    if (!parsed || !parsed.title) return;
    const normalized = normalizeTitle(parsed.title);
    if (!normalized || seenTitles.has(normalized)) return;
    seenTitles.add(normalized);

    const combinedText = `${parsed.title} ${parsed.description || ''}`.trim();
    const categories = detectCategories(combinedText, activeCategories);
    const tags = detectTags(combinedText);
    const allergens = detectAllergens(combinedText);
    const match = findMatch(parsed.title, existingDishes);

    drafts.push({
      sourceIngestId: ingest.id,
      title: parsed.title,
      description: parsed.description,
      categories,
      tags,
      allergens,
      confidence: match ? match.score : null,
      matchedDishId: match ? match.dish.id : null,
      status: 'pending',
    });
  });

  if (!drafts.length) {
    warnings.push('No dishes parsed from payload.');
  }

  if (drafts.length) {
    await prisma.dishDraft.createMany({ data: drafts });
  }

  return res.status(200).json({
    ok: true,
    ingestId: ingest.id,
    draftCount: drafts.length,
    warnings,
  });
};
