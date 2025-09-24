const { searchSupport } = require('./utils/supportSearchService');

async function supportSearchHandler(req, res) {
  try {
    const q = (req.query.q || '').toString();
    if (!q) return res.status(400).json({ error: 'missing q' });
    const results = await searchSupport(q);
    return res.json(results);
  } catch (err) {
    console.error('support search error', err);
    if (err?.code === 'search-not-configured') {
      return res.status(500).json({ error: 'search-not-configured' });
    }
    if (err?.code === 'missing-query') {
      return res.status(400).json({ error: 'missing q' });
    }
    return res.status(500).json({ error: 'search-failed' });
  }
}

function registerSupportSearch(app) {
  app.get('/api/support/search', supportSearchHandler);
}

module.exports = { registerSupportSearch, supportSearchHandler };
