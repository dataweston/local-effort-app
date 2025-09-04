-- Supabase schema for Support KB (Phase 1)
create extension if not exists vector;
create extension if not exists pgcrypto;

-- Sources (Sanity docs, pages, curated articles)
create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'faq' | 'doc' | 'page' | 'article'
  source_id text,     -- Sanity _id or URL id
  url text,
  title text,
  tags text[] default '{}',
  published boolean default true,
  updated_at timestamptz default now()
);

-- Chunks of content for search
create table if not exists public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.content_sources(id) on delete cascade,
  ord int not null default 0,
  heading text,
  anchor text,
  text text not null,
  tokens int,
  tags text[] default '{}',
  updated_at timestamptz default now(),
  ts tsvector generated always as (to_tsvector('english', coalesce(heading,'') || ' ' || coalesce(text,''))) stored
);

-- Embeddings per chunk
create table if not exists public.embeddings (
  chunk_id uuid primary key references public.content_chunks(id) on delete cascade,
  embedding vector(1536) not null,
  model text not null default 'text-embedding-3-small',
  created_at timestamptz default now()
);

-- Cached answers for frequent questions
create table if not exists public.cached_answers (
  cache_key text primary key,
  question_norm text not null,
  answer_md text not null,
  citations jsonb not null default '[]',
  confidence real not null default 0.0,
  ttl_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_content_chunks_ts on public.content_chunks using gin(ts);
create index if not exists idx_content_chunks_source on public.content_chunks(source_id);

-- Simple ANN function using pgvector for nearest chunks
create or replace function public.match_chunks(
  query_embedding vector(1536),
  match_count int default 10,
  match_threshold float default 1.5,
  filter_tags text[] default null
)
returns table (
  chunk_id uuid,
  source_id uuid,
  ord int,
  heading text,
  anchor text,
  text text,
  distance float
)
language sql stable parallel safe as $$
  select c.id as chunk_id, c.source_id, c.ord, c.heading, c.anchor, c.text,
         (e.embedding <-> query_embedding) as distance
  from public.content_chunks c
  join public.embeddings e on e.chunk_id = c.id
  where (filter_tags is null or c.tags && filter_tags)
  order by e.embedding <-> query_embedding asc
  limit match_count;
$$;

-- Note: Add RLS policies as needed; by default Supabase enables RLS. For public search,
-- create policies to allow anon SELECT on published sources and their chunks.
