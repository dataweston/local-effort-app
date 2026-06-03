const BREVO_API_BASE = 'https://api.brevo.com/v3';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const { phone } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'valid-phone-required' });
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) {
    return res.status(400).json({ error: 'valid-phone-required' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[localist] BREVO_API_KEY not configured');
    return res.status(503).json({ error: 'brevo-not-configured' });
  }

  const listIdsEnv = process.env.BREVO_LOCALIST_LIST_ID || '';
  const listIds = listIdsEnv
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));

  const mobilePhone = `+1${digits}`;

  try {
    const payload = {
      mobilePhone,
      attributes: { SMS: mobilePhone },
      ...(listIds.length > 0 && { listIds }),
      updateEnabled: true,
    };

    const response = await fetch(`${BREVO_API_BASE}/contacts`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 400 && data.code === 'duplicate_parameter') {
        // Already subscribed — add to list if needed
        if (listIds.length > 0) {
          await fetch(`${BREVO_API_BASE}/contacts/${encodeURIComponent(mobilePhone)}`, {
            method: 'PUT',
            headers: {
              accept: 'application/json',
              'api-key': apiKey,
              'content-type': 'application/json',
            },
            body: JSON.stringify({ listIds }),
          });
        }
        return res.status(200).json({ ok: true });
      }
      throw new Error(data.message || response.statusText);
    }

    console.log(`[localist] subscribed: ${mobilePhone}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[localist] subscribe error:', error.message);
    return res.status(500).json({ error: 'internal-error' });
  }
}
