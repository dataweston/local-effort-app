const { getSupabase } = require('../supabaseClient');

const MAX_CACHE_ENTRIES = 200;
const DEFAULT_TTL_MS = 60 * 1000; // 60s

const memoryCache = new Map();

function setCache(key, value, ttlMs = DEFAULT_TTL_MS) {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, { expires: Date.now() + ttlMs, value });
}

function getCache(key) {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
}

function normalizeKey(q) {
  return (q || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 200);
}

async function getEmbedding(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.embedding || null;
  } catch (_err) {
    return null;
  }
}

const SYNONYMS = {
  pasta: ['spaghetti', 'noodles', 'macaroni', 'penne', 'fettuccine', 'lasagna'],
  beef: ['steak', 'steaks', 'sirloin', 'roast beef'],
  pork: ['ham', 'bacon', 'pancetta', 'prosciutto'],
  dessert: ['desserts', 'sweets', 'pastry', 'pastries', 'cake', 'cakes'],
  salad: ['salads', 'greens'],
  appetizer: ['appetizers', 'starter', 'starters', 'tapas'],
  soup: ['soups', 'broth'],
  bread: ['breads', 'loaf', 'loaves', 'focaccia', 'sourdough'],
  tomato: ['tomatoes'],
  potato: ['potatoes'],
  berry: ['berries'],
  pizza: ['pizzas', 'margherita'],
};

function expandToken(token) {
  const variants = new Set([token]);
  if (token.endsWith('ies') && token.length > 3) variants.add(token.slice(0, -3) + 'y');
  if (token.endsWith('es')) variants.add(token.slice(0, -2));
  if (token.endsWith('s')) {
    variants.add(token.slice(0, -1));
  } else {
    variants.add(`${token}s`);
    variants.add(`${token}es`);
  }
  if (SYNONYMS[token]) {
    for (const synonym of SYNONYMS[token]) {
      variants.add(String(synonym).toLowerCase());
    }
  }
  return Array.from(variants);
}

async function searchSupport(query, { supabase = getSupabase(), useCache = true } = {}) {
  const normalized = normalizeKey(query);
  if (!normalized) {
    const err = new Error('missing-query');
    err.code = 'missing-query';
    throw err;
  }
  if (!supabase) {
    const err = new Error('search-not-configured');
    err.code = 'search-not-configured';
    throw err;
  }

  if (useCache) {
    const cachedHit = getCache(normalized);
    if (cachedHit) return cachedHit;
  }

  const nowIso = new Date().toISOString();
  const cached = await supabase
    .from('cached_answers')
    .select('answer_md,citations,confidence,ttl_at')
    .eq('cache_key', normalized)
    .gte('ttl_at', nowIso)
    .maybeSingle();

  if (cached.data) {
    const payload = {
      cached: true,
      answer: cached.data.answer_md,
      citations: cached.data.citations,
      confidence: cached.data.confidence,
    };
    if (useCache) setCache(normalized, payload);
    return payload;
  }

  const tokens = normalized
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const websearch = tokens
    .map((t) => `(${expandToken(t).map((v) => `"${v}"`).join(' | ')})`)
    .join(' & ');

  const [fts, emb] = await Promise.all([
    supabase
      .from('content_chunks')
      .select('id, source_id, ord, heading, anchor, text', { count: 'planned', head: false })
      .textSearch('ts', websearch || normalized, { type: 'websearch', config: 'english' })
      .limit(10),
    getEmbedding(normalized),
  ]);

  let vectorMatches = [];
  if (emb) {
    const vm = await supabase.rpc('match_chunks', { query_embedding: emb, match_count: 10 });
    if (!vm.error && Array.isArray(vm.data)) {
      vectorMatches = vm.data.map((row) => ({
        id: row.chunk_id,
        source_id: row.source_id,
        ord: row.ord,
        heading: row.heading,
        anchor: row.anchor,
        text: row.text,
        distance: row.distance,
      }));
    }
  }

  const seen = new Set();
  const merged = [];
  for (const match of vectorMatches) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    merged.push({ ...match, score: match.distance != null ? 1 / (1 + match.distance) : 0.5 });
  }

  if (fts && Array.isArray(fts.data)) {
    for (const row of fts.data) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push({ ...row, score: 0.4 });
    }
  }

  merged.sort((a, b) => b.score - a.score);
  const results = merged.slice(0, 10);

  const response = { cached: false, results };
  if (useCache) setCache(normalized, response);
  return response;
}

module.exports = {
  searchSupport,
  normalizeKey,
};
