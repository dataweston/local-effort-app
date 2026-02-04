// Serverless proxy for sales pages to Next app
// Env: SALES_NEXT_BASE (e.g., https://sales-next.vercel.app)
let cachedFetch = null;

const resolveFetch = async () => {
  if (cachedFetch) return cachedFetch;
  if (typeof fetch === 'function') {
    cachedFetch = fetch;
    return cachedFetch;
  }
  const mod = await import('node-fetch');
  cachedFetch = mod.default;
  return cachedFetch;
};

module.exports = async (req, res) => {
  try {
    const base = process.env.SALES_NEXT_BASE;
    if (!base) {
      res.statusCode = 500;
      res.end('Missing SALES_NEXT_BASE env');
      return;
    }
    const url = new URL(req.url, 'http://internal');
    const path = url.searchParams.get('path') || '';

    // Build target URL; best-effort to preserve query from original /sales path if present as q
    const qs = url.searchParams.get('q');
    const target = new URL(path.replace(/^\//, ''), base);
    if (qs) {
      const qsObj = new URLSearchParams(qs);
      qsObj.forEach((v, k) => target.searchParams.set(k, v));
    }

    const fetcher = await resolveFetch();
    const upstream = await fetcher(target.toString(), {
      method: 'GET',
      headers: {
        'x-forwarded-host': req.headers['host'] || '',
        'x-proxy-source': 'root-sales-proxy'
      }
    });

    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error('[sales-proxy] error', err);
    res.statusCode = 502;
    res.end('Bad gateway');
  }
};
