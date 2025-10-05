const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return null;
    }
  }
  return null;
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = parseBody(req);
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  const { order, jwt } = payload;
  if (!order || typeof jwt !== 'string' || !jwt.trim()) {
    return res.status(400).json({ error: 'Missing order or token.' });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/brevo/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, jwt }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to resend email.');
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Unable to resend email.' });
  }
};
