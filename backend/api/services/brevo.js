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
        await sc.createIfNotExists({
          _id: `contact-${sanitizedEmail}`,
          _type: 'contact',
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          phone: phone || null,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        if (logger) logger.warn({ err }, 'failed to mirror contact in sanity');
      }
    }
  };

  return {
    getHeaders,
    sendEmail,
    upsertContact,
  };
}

module.exports = { createBrevoService };
