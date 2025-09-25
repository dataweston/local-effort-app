const site = process.env.SITE_ORIGIN || 'https://localeffortfood.com';

// For now, releases are static; could be migrated to CMS later.
function getReleases() {
  return [
    {
      id: '2025-09-30-pizza-campaign',
      title: 'Local Effort Seeks Support to Craft 1,000 Fully Local Pizzas',
      url: `${site}/releases`,
      date: '2025-09-30T09:00:00-05:00',
      description: 'Community-backed push to produce 1,000 pizzas sourced entirely from Midwestern growers and producers.'
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
  const items = releases.map(r => `\n    <item>\n      <guid isPermaLink="false">${esc(r.id)}</guid>\n      <title>${esc(r.title)}</title>\n      <link>${esc(r.url)}</link>\n      <pubDate>${new Date(r.date).toUTCString()}</pubDate>\n      <description>${esc(r.description)}</description>\n    </item>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Local Effort Releases</title>\n    <link>${esc(site)}/releases</link>\n    <description>Press releases and media updates from Local Effort Food Co.</description>\n    <language>en-us</language>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}\n  </channel>\n</rss>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.end(xml);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Failed to generate releases RSS');
  }
};
