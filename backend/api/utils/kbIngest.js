const { createClient: createSanity } = require('@sanity/client');
const { createClient: createSupabase } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getClients() {
  const sanity = createSanity({
    projectId: process.env.SANITY_PROJECT_ID || process.env.VITE_APP_SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET || process.env.VITE_APP_SANITY_DATASET || 'production',
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
    apiVersion: '2024-01-01',
  });
  const supabase = createSupabase(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return { sanity, supabase };
}

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

async function embed(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.[0]?.embedding || null;
}

async function upsertSource(supabase, { type, source_id, url, title, tags = [] }) {
  const { data: existing } = await supabase
    .from('content_sources')
    .select('id')
    .eq('source_id', source_id)
    .maybeSingle();
  if (existing) {
    await supabase
      .from('content_sources')
      .update({ type, url, title, tags, published: true, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return existing.id;
  }
  const { data: ins, error } = await supabase
    .from('content_sources')
    .insert([{ type, source_id, url, title, tags, published: true }])
    .select('id')
    .single();
  if (error) throw error;
  return ins.id;
}

async function replaceChunksForSource(supabase, sourceId, chunks) {
  await supabase.from('content_chunks').delete().eq('source_id', sourceId);
  if (!chunks || chunks.length === 0) return [];
  const { data, error } = await supabase
    .from('content_chunks')
    .insert(chunks.map((c, i) => ({
      source_id: sourceId,
      ord: c.ord ?? i,
      heading: c.heading ?? null,
      anchor: c.anchor ?? null,
      text: c.text,
      tokens: c.tokens ?? (c.text?.split(/\s+/).length || null),
      tags: c.tags || [],
    })))
    .select('id, ord');
  if (error) throw error;
  return data || [];
}

async function upsertEmbeddings(supabase, rows, texts) {
  if (!rows || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += 1) {
    const vec = await embed(texts[i]);
    if (vec) {
      // eslint-disable-next-line no-await-in-loop
      await supabase.from('embeddings').upsert({ chunk_id: rows[i].id, embedding: vec, model: 'text-embedding-3-small' }, { onConflict: 'chunk_id' });
    }
  }
}

function flattenPortableText(blocks) {
  if (!Array.isArray(blocks)) return '';
  const parts = [];
  for (const b of blocks) {
    if (b._type === 'block') {
      const text = (b.children || []).map((c) => c.text || '').join('');
      if (b.style && /^h[1-6]$/.test(b.style)) {
        parts.push(`\n\n${text}\n`); // headings as separators
      } else {
        parts.push(text);
      }
    }
  }
  return parts.join('\n');
}

function chunkByHeadings(text, maxTokens = 900) {
  const sections = text.split(/\n\s*\n/); // rough paragraph/heading split
  const chunks = [];
  let buf = '';
  let heading = null;
  for (const s of sections) {
    const isHeading = /^#{0,3}?\s*[A-Za-z].{0,80}$/.test(s) || s.length < 80; // heuristics
    if (isHeading) {
      if (buf.trim()) {
        chunks.push({ heading, text: buf.trim() });
        buf = '';
      }
      heading = s.trim();
      continue;
    }
    if ((buf + '\n\n' + s).split(/\s+/).length > maxTokens) {
      chunks.push({ heading, text: buf.trim() });
      buf = s;
    } else {
      buf = buf ? `${buf}\n\n${s}` : s;
    }
  }
  if (buf.trim()) chunks.push({ heading, text: buf.trim() });
  return chunks.map((c, i) => ({ ...c, anchor: c.heading ? slugify(c.heading) : null, ord: i }));
}

async function ingestFaqs({ supabase, faqs }) {
  for (const doc of faqs) {
    const title = doc.question || '(Untitled)';
    const anchor = slugify(title);
    const text = (doc.answer || '').toString();
    const tags = ['faq'];
    const sourceId = await upsertSource(supabase, { type: 'faq', source_id: doc._id, title, tags });
    const rows = await replaceChunksForSource(supabase, sourceId, [
      { ord: 0, heading: title, anchor, text, tags },
    ]);
    await upsertEmbeddings(supabase, rows, rows.map(() => `${title}\n\n${text}`));
  }
}

async function fetchFaqsFromSanity(sanity) {
  try {
    return await sanity.fetch(`*[_type == "pricingFaq"]{ _id, question, answer }`);
  } catch (_) {
    return [];
  }
}

async function fetchPagesFromSanity(sanity) {
  try {
    return await sanity.fetch(`*[_type == "page"]{ _id, title, slug, introduction, content }`);
  } catch (_) {
    return [];
  }
}

async function ingestPages({ supabase, pages }) {
  for (const doc of pages) {
    const title = doc.title || 'Page';
    const url = doc.slug && doc.slug.current ? `/${doc.slug.current}` : null;
    const intro = doc.introduction || '';
    const rich = flattenPortableText(doc.content || []);
    const text = [intro, rich].filter(Boolean).join('\n\n');
    const sections = chunkByHeadings(text);
    const sourceId = await upsertSource(supabase, { type: 'page', source_id: doc._id, title, url, tags: ['page'] });
    const rows = await replaceChunksForSource(supabase, sourceId, sections.map((s, i) => ({ ...s, ord: i, tags: ['page'] })));
    await upsertEmbeddings(supabase, rows, sections.map((s) => `${s.heading || title}\n\n${s.text}`));
  }
}

module.exports = {
  getClients,
  ingestFaqs,
  fetchFaqsFromSanity,
  fetchPagesFromSanity,
  ingestPages,
  // local docs ingestion helpers (exported for testing if needed)
};

// --- Local docs ingestion (Markdown/JSON) ---

function readAllFiles(dir, exts = ['.md', '.markdown', '.json']) {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (exts.includes(path.extname(name).toLowerCase())) out.push(full);
    }
  };
  walk(abs);
  return out;
}

function loadLocalDocs(baseDir = 'docs/support') {
  const files = readAllFiles(baseDir);
  const docs = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    try {
      const raw = fs.readFileSync(file, 'utf8');
      if (ext === '.json') {
        const data = JSON.parse(raw);
        const title = data.title || path.basename(file);
        const body = data.body || JSON.stringify(data, null, 2);
        docs.push({ _id: `local-${path.relative(baseDir, file)}`.replace(/[^a-z0-9_-]/gi, '-'), title, text: body, url: null, tags: ['local', 'json'] });
      } else {
        // Markdown as-is
        const title = raw.split('\n')[0].replace(/^#\s*/, '').slice(0, 120) || path.basename(file);
        docs.push({ _id: `local-${path.relative(baseDir, file)}`.replace(/[^a-z0-9_-]/gi, '-'), title, text: raw, url: null, tags: ['local', 'md'] });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read local doc:', file, e && e.message);
    }
  }
  return docs;
}

async function ingestLocalDocs({ supabase, docs }) {
  for (const doc of docs) {
    const title = doc.title || '(Doc)';
    const text = String(doc.text || '');
    const url = doc.url || null;
    const tags = Array.isArray(doc.tags) ? doc.tags : ['local'];
    const sourceId = await upsertSource(supabase, { type: 'doc', source_id: doc._id, url, title, tags });
    const sections = chunkByHeadings(text);
    const rows = await replaceChunksForSource(supabase, sourceId, sections.map((s, i) => ({ ...s, ord: i, tags })));
    await upsertEmbeddings(supabase, rows, sections.map((s) => `${s.heading || title}\n\n${s.text}`));
  }
}

module.exports.loadLocalDocs = loadLocalDocs;
module.exports.ingestLocalDocs = ingestLocalDocs;
