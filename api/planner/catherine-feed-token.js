const { verifySupabaseToken } = require('./_auth');
const { createPlannerFeedToken } = require('./_feedToken');

function buildBaseUrl(req) {
  const host =
    req.headers['x-forwarded-host'] ||
    req.headers.host ||
    process.env.SITE_HOST ||
    'localeffortfood.com';
  const proto =
    req.headers['x-forwarded-proto'] ||
    (String(host).includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifySupabaseToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = createPlannerFeedToken({ uid: user.id });
  if (!token) {
    return res.status(500).json({
      error: 'Calendar feed is not configured. Missing PLANNER_FEED_SECRET.',
    });
  }

  const baseUrl = buildBaseUrl(req);
  const httpsUrl = `${baseUrl}/api/planner/catherine-feed?token=${encodeURIComponent(token)}`;
  const webcalUrl = httpsUrl.replace(/^https?:\/\//i, 'webcal://');

  return res.status(200).json({
    httpsUrl,
    webcalUrl,
  });
};
