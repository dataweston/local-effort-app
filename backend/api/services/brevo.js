const fetchImpl = (...args) => fetch(...args);

function createBrevoService({ getSanityClient, logger, fetch = fetchImpl } = {}) {
  const resolveHeaders = () => {
    const key = process.env.BREVO_API_KEY;
    if (!key) return null;
    return {
      'api-key': key,
      accept: 'application/json',
      'content-type': 'application/json',
    };
  };

  const getHeaders = () => resolveHeaders();

  const sendEmail = async (payload) => {
    const headers = resolveHeaders();
    if (!headers) {
      const error = new Error('Email service not configured');
      error.code = 'EMAIL_NOT_CONFIGURED';
      throw error;
    }
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      const error = new Error('Brevo send failed');
      error.status = response.status;
      error.details = details;
      throw error;
    }
    return response;
  };

  const upsertContact = async ({ email, firstName, lastName, phone, listIds = [] }) => {
    const headers = resolveHeaders();
    if (!headers) throw new Error('BREVO_API_KEY is not configured on the server');
    const normalizedListIds = Array.isArray(listIds)
      ? listIds
          .map((id) => parseInt(id, 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const body = {
      email,
      attributes: {
        FIRSTNAME: firstName || undefined,
        LASTNAME: lastName || undefined,
        SMS: phone || undefined,
      },
      listIds: normalizedListIds.length > 0 ? normalizedListIds : undefined,
      updateEnabled: true,
    };
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok && response.status !== 400) {
      const text = await response.text().catch(() => '');
      throw new Error(`Brevo contacts error ${response.status}: ${text}`);
    }
    const sc = getSanityClient ? getSanityClient() : null;
    if (sc && email) {
      try {
        // Sanitize email for use as document ID (replace @ and . with safe characters)
        const sanitizedEmail = email.replace(/@/g, '-at-').replace(/\./g, '-');
        const id = `contact-${sanitizedEmail}`;
        const now = new Date().toISOString();
        await sc.createIfNotExists({
          _id: id,
          _type: 'contact',
          email,
          createdAt: now,
        });
        await sc.patch(id).set({
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          phone: phone || null,
          brevoListIds: normalizedListIds,
          updatedAt: now,
        }).commit();
      } catch (err) {
        if (logger) logger.warn({ err }, 'failed to mirror contact in sanity');
      }
    }
  };

  const updateContact = async ({ email, attributes = {}, listIds }) => {
    const headers = resolveHeaders();
    if (!headers) throw new Error('BREVO_API_KEY is not configured on the server');
    const normalizedListIds = Array.isArray(listIds)
      ? listIds
          .map((id) => parseInt(id, 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      : null;
    const body = {
      attributes: attributes && typeof attributes === 'object' ? attributes : undefined,
      ...(normalizedListIds ? { listIds: normalizedListIds } : {}),
    };
    const response = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Brevo contact update error ${response.status}: ${text}`);
    }
  };

  const blacklistContact = async ({ email, emailBlacklisted = true }) => {
    const headers = resolveHeaders();
    if (!headers) throw new Error('BREVO_API_KEY is not configured on the server');
    const response = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ emailBlacklisted: !!emailBlacklisted }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Brevo contact blacklist error ${response.status}: ${text}`);
    }
  };

  const removeFromLists = async ({ email, listIds = [] }) => {
    const headers = resolveHeaders();
    if (!headers) throw new Error('BREVO_API_KEY is not configured on the server');
    const normalizedListIds = Array.isArray(listIds)
      ? listIds
          .map((id) => parseInt(id, 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];
    if (!normalizedListIds.length) return;
    const response = await fetch(`https://api.brevo.com/v3/contacts/lists/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ unlinkListIds: normalizedListIds }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Brevo contact unlink list error ${response.status}: ${text}`);
    }
  };

  return {
    getHeaders,
    sendEmail,
    upsertContact,
    updateContact,
    blacklistContact,
    removeFromLists,
  };
}

module.exports = { createBrevoService };
