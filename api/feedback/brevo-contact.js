/**
 * Add contact to Brevo list (for waitlists, newsletters, etc.)
 * POST /api/feedback/brevo-contact
 */

const { addContactToBrevo } = require('../_lib/brevo');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  try {
    const { email, listIds = [], attributes = {} } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'valid-email-required' });
    }

    const result = await addContactToBrevo({
      email: email.trim(),
      listIds: Array.isArray(listIds) ? listIds : [],
      attributes,
      updateEnabled: true,
    });

    if (result.skipped) {
      return res.status(503).json({ error: 'brevo-not-configured' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[brevo-contact] Error:', error);
    return res.status(500).json({ error: 'internal-error' });
  }
}
