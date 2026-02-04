/**
 * Brevo Contact Management Utilities
 * 
 * Functions for managing contacts in Brevo (formerly SendinBlue):
 * - Add contacts to lists
 * - Update contact attributes
 * - Send transactional emails
 * 
 * Docs: https://developers.brevo.com/reference/createcontact
 */

const BREVO_API_BASE = 'https://api.brevo.com/v3';

/**
 * Add or update a contact in Brevo and add them to a list
 * 
 * @param {Object} params - Contact parameters
 * @param {string} params.email - Contact email (required)
 * @param {string} params.firstName - Contact first name
 * @param {string} params.lastName - Contact last name
 * @param {Object} params.attributes - Additional contact attributes
 * @param {number[]} params.listIds - Brevo list IDs to add contact to
 * @param {boolean} params.updateEnabled - Whether to update existing contacts
 * @returns {Promise<Object>} Brevo API response
 */
async function addContactToBrevo({
  email,
  firstName = '',
  lastName = '',
  attributes = {},
  listIds = [],
  updateEnabled = true,
}) {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    console.warn('[Brevo] BREVO_API_KEY not configured - skipping contact sync');
    return { skipped: true, reason: 'No API key' };
  }

  if (!email) {
    throw new Error('Email is required for Brevo contact');
  }

  // Build contact payload
  const payload = {
    email: email.toLowerCase().trim(),
    attributes: {
      FIRSTNAME: firstName || '',
      LASTNAME: lastName || '',
      ...attributes,
    },
    listIds: listIds.length > 0 ? listIds : undefined,
    updateEnabled,
  };

  try {
    const response = await fetch(`${BREVO_API_BASE}/contacts`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      // Contact already exists - this is OK if updateEnabled
      if (response.status === 400 && data.code === 'duplicate_parameter') {
        console.log(`[Brevo] Contact ${email} already exists - updating...`);
        return await updateBrevoContact({ email, firstName, lastName, attributes, listIds });
      }

      throw new Error(`Brevo API error: ${data.message || response.statusText}`);
    }

    console.log(`[Brevo] ✅ Contact added: ${email}${listIds.length > 0 ? ` (Lists: ${listIds.join(', ')})` : ''}`);
    return { success: true, id: data.id };
    
  } catch (error) {
    console.error('[Brevo] Failed to add contact:', error.message);
    throw error;
  }
}

/**
 * Update an existing Brevo contact
 * 
 * @param {Object} params - Contact parameters
 * @param {string} params.email - Contact email (required)
 * @param {string} params.firstName - Contact first name
 * @param {string} params.lastName - Contact last name
 * @param {Object} params.attributes - Additional contact attributes
 * @param {number[]} params.listIds - Brevo list IDs to add contact to
 * @returns {Promise<Object>} Brevo API response
 */
async function updateBrevoContact({
  email,
  firstName,
  lastName,
  attributes = {},
  listIds = [],
}) {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    return { skipped: true, reason: 'No API key' };
  }

  const payload = {
    attributes: {
      ...(firstName && { FIRSTNAME: firstName }),
      ...(lastName && { LASTNAME: lastName }),
      ...attributes,
    },
    ...(listIds.length > 0 && { listIds }),
  };

  try {
    const response = await fetch(`${BREVO_API_BASE}/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(`Brevo API error: ${data.message || response.statusText}`);
    }

    console.log(`[Brevo] ✅ Contact updated: ${email}`);
    return { success: true };
    
  } catch (error) {
    console.error('[Brevo] Failed to update contact:', error.message);
    throw error;
  }
}

/**
 * Add a pizza backer to Brevo after successful pledge
 * This is specifically for Pizza Funder campaign backers
 * 
 * @param {Object} pledgeData - Pledge data from database
 * @param {string} pledgeData.email - Backer email
 * @param {string} pledgeData.funder_name - Backer name
 * @param {number} pledgeData.pizza_count - Number of pizzas pledged
 * @param {number} pledgeData.amount_cents - Amount paid in cents
 * @param {string} pledgeData.reward_preference - Reward preference
 * @param {string} pledgeData.discount_code - Discount code used
 * @returns {Promise<Object>} Brevo response
 */
async function addPizzaBackerToBrevo(pledgeData) {
  const {
    email,
    funder_name,
    pizza_count,
    amount_cents,
    reward_preference,
    discount_code,
    phone,
  } = pledgeData;

  // Parse name (assume "First Last" format)
  const nameParts = (funder_name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Custom attributes for pizza backers
  const attributes = {
    PIZZA_COUNT: pizza_count || 0,
    PLEDGE_AMOUNT: (amount_cents / 100).toFixed(2), // Convert cents to dollars
    REWARD_PREFERENCE: reward_preference || 'Not specified',
    PLEDGE_DATE: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    DISCOUNT_CODE: discount_code || '',
    SMS: phone || '', // Brevo's SMS field
  };

  // List IDs from environment variable (comma-separated)
  // Example: BREVO_PIZZAFUNDER_LIST_IDS=123,456
  const listIdsEnv = process.env.BREVO_PIZZAFUNDER_LIST_IDS || '';
  const listIds = listIdsEnv
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id));

  if (listIds.length === 0) {
    console.warn('[Brevo] BREVO_PIZZAFUNDER_LIST_IDS not configured - contact will be added without list assignment');
  }

  return addContactToBrevo({
    email,
    firstName,
    lastName,
    attributes,
    listIds,
    updateEnabled: true, // Update if already exists
  });
}

module.exports = {
  addContactToBrevo,
  updateBrevoContact,
  addPizzaBackerToBrevo,
};
