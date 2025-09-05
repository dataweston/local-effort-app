const { getSupabase } = require('./supabaseClient');

// Simple in-memory LRU cache for search results to speed up repeats
const MAX_CACHE_ENTRIES = 200;
const DEFAULT_TTL_MS = 60 * 1000; // 60s
const memoryCache = new Map(); // key -> { expires, value }

function setCache(key, value, ttlMs = DEFAULT_TTL_MS) {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    // delete oldest entry (Map iteration order is insertion order)
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

async function getEmbedding(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.embedding || null;
  } catch (_e) {
    return null;
  }
}

function normalizeKey(q) {
  return (q || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 200);
}

async function supportSearchHandler(req, res) {
  try {
    const q = (req.query.q || '').toString();
    if (!q) return res.status(400).json({ error: 'missing q' });
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: 'search-not-configured' });

    const cacheKey = normalizeKey(q);
    const mem = getCache(cacheKey);
    if (mem) return res.json({ cached: true, results: mem });
    // Try cached answer first
    const nowIso = new Date().toISOString();
    const cached = await supabase
      .from('cached_answers')
      .select('answer_md,citations,confidence,ttl_at')
      .eq('cache_key', cacheKey)
      .gte('ttl_at', nowIso)
      .maybeSingle();
    if (cached.data) {
      return res.json({ cached: true, answer: cached.data.answer_md, citations: cached.data.citations, confidence: cached.data.confidence });
    }

    // Expand query terms with plural/singular and synonyms for the FTS path
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
      pizza: ['pizzas', 'margherita']
    };
    const tokens = q
      .toLowerCase()
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const expand = (t) => {
      const v = new Set([t]);
      if (t.endsWith('ies') && t.length > 3) v.add(t.slice(0, -3) + 'y');
      if (t.endsWith('es')) v.add(t.slice(0, -2));
      if (t.endsWith('s')) v.add(t.slice(0, -1)); else { v.add(t + 's'); v.add(t + 'es'); }
      if (SYNONYMS[t]) SYNONYMS[t].forEach((s) => v.add(String(s).toLowerCase()));
      return Array.from(v);
    };
    const websearch = tokens
      .map((t) => `(${expand(t).map((v) => `"${v}"`).join(' | ')})`)
      .join(' & ');

    // Hybrid search: text + vector
    const [fts, emb] = await Promise.all([
      supabase
        .from('content_chunks')
        .select('id, source_id, ord, heading, anchor, text', { count: 'planned', head: false })
        .textSearch('ts', websearch || q, { type: 'websearch', config: 'english' })
        .limit(10),
      getEmbedding(q),
    ]);

    let vectorMatches = [];
    if (emb) {
      const vm = await supabase.rpc('match_chunks', { query_embedding: emb, match_count: 10 });
      if (!vm.error && Array.isArray(vm.data)) {
        vectorMatches = vm.data.map((r) => ({ id: r.chunk_id, source_id: r.source_id, ord: r.ord, heading: r.heading, anchor: r.anchor, text: r.text, distance: r.distance }));
      }
    }

    // Merge results (prefer vector then fts unique by id)
    const seen = new Set();
    const merged = [];
    for (const r of vectorMatches) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      merged.push({ ...r, score: r.distance != null ? 1 / (1 + r.distance) : 0.5 });
    }
    if (fts && Array.isArray(fts.data)) {
      for (const r of fts.data) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        merged.push({ ...r, score: 0.4 });
      }
    }
    // Limit to top 10
    merged.sort((a, b) => b.score - a.score);
  const results = merged.slice(0, 10);

  // store in memory cache for a short time
  setCache(cacheKey, results);

    return res.json({ cached: false, results });
  } catch (err) {
    console.error('support search error', err);
    return res.status(500).json({ error: 'search-failed' });
  }
}

function registerSupportSearch(app) {
  app.get('/api/support/search', supportSearchHandler);
}

module.exports = { registerSupportSearch };
