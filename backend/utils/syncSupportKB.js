/*
  Sync Sanity FAQs into Supabase KB tables (Phase 1)
  Env required:
    SANITY_PROJECT_ID, SANITY_DATASET, (optional) SANITY_API_TOKEN
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    (optional) OPENAI_API_KEY for embeddings
*/
/* eslint-disable no-console */
const { createClient: createSanity } = require('@sanity/client');
const { createClient: createSupabase } = require('@supabase/supabase-js');

async function embed(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
  const data = await res.json();
  return data?.data?.[0]?.embedding || null;
}

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

async function main() {
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

  console.log('Fetching FAQs from Sanity…');
  const faqs = await sanity.fetch(`*[_type == "pricingFaq"]{ _id, question, answer }`);
  console.log(`Found ${faqs.length} FAQ(s).`);

  for (const doc of faqs) {
    const title = doc.question || '(Untitled)';
    const anchor = slugify(title);
    const text = (doc.answer || '').toString();
    const tags = ['faq'];

    // Upsert source by source_id
    let sourceId = null;
    {
      const { data: existing, error: selErr } = await supabase
        .from('content_sources')
        .select('id')
        .eq('source_id', doc._id)
        .maybeSingle();
      if (selErr) throw selErr;
      if (existing) {
        sourceId = existing.id;
        await supabase
          .from('content_sources')
          .update({ title, tags, published: true, updated_at: new Date().toISOString(), type: 'faq' })
          .eq('id', sourceId);
      } else {
        const { data: ins, error: insErr } = await supabase
          .from('content_sources')
          .insert([{ type: 'faq', source_id: doc._id, title, tags, published: true }])
          .select('id')
          .single();
        if (insErr) throw insErr;
        sourceId = ins.id;
      }
    }

    // Replace chunks for this source (simple one-chunk per FAQ)
    await supabase.from('content_chunks').delete().eq('source_id', sourceId);
    const { data: chunkRow, error: chunkErr } = await supabase
      .from('content_chunks')
      .insert([
        {
          source_id: sourceId,
          ord: 0,
          heading: title,
          anchor,
          text,
          tokens: text.split(/\s+/).length,
          tags,
        },
      ])
      .select('id')
      .single();
    if (chunkErr) throw chunkErr;

    // Optional embedding
    try {
      const vec = await embed(`${title}\n\n${text}`);
      if (vec) {
        await supabase
          .from('embeddings')
          .upsert({ chunk_id: chunkRow.id, embedding: vec, model: 'text-embedding-3-small' }, { onConflict: 'chunk_id' });
      }
    } catch (e) {
      console.warn('Embedding skipped:', e.message);
    }
  }

  console.log('Sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
