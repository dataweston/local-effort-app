const site = process.env.SITE_ORIGIN || 'https://localeffortfood.com';

function getReleases() {
  return [
    {
      id: '2025-05-30-pizza-campaign',
      title: 'Local Effort Seeks Support to Craft 1,000 Fully Local Pizzas',
      url: `${site}/releases`,
      updated: '2025-05-30T14:00:00Z',
      summary: 'Community-backed push to produce 1,000 pizzas sourced entirely from Midwestern growers and producers.'
    }
  ];
}

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = async (req, res) => {
  try {
    const releases = getReleases();
    const updated = releases[0] ? releases[0].updated : new Date().toISOString();
    const entries = releases.map(r => `\n  <entry>\n    <id>tag:localeffortfood.com,${r.updated}:${r.id}</id>\n    <title>${esc(r.title)}</title>\n    <link href="${esc(r.url)}" />\n    <updated>${esc(r.updated)}</updated>\n    <summary>${esc(r.summary)}</summary>\n  </entry>`).join('');

    const xml = `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <id>tag:localeffortfood.com,2025:releases</id>\n  <title>Local Effort Releases</title>\n  <updated>${esc(updated)}</updated>\n  <link rel="self" href="${site}/api/feeds/releases.atom" />\n  <link rel="alternate" href="${site}/releases" />${entries}\n</feed>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.end(xml);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Failed to generate releases Atom feed');
  }
};
