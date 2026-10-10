const CONTACT = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || 'yum@localeffortfood.com';
const FROM_EMAIL = process.env.SENDER_EMAIL || CONTACT;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100);
const clean = (value, fallback = 'Not provided') => String(value ?? '').trim() || fallback;
const addressText = (address = {}) => [address.line1, address.line2, [address.city, address.state, address.postal].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Not provided';
const addressHtml = (address) => escapeHtml(addressText(address));

function shell(body) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#24201c;line-height:1.5"><main style="max-width:600px;margin:auto;padding:24px">${body}<p>Questions or changes? Reply to this email or contact ${escapeHtml(CONTACT)}.</p></main></body></html>`;
}
function payloadBase() {
  return { sender: { email: FROM_EMAIL, name: 'Local Effort' }, replyTo: { email: CONTACT, name: 'Local Effort' }, tags: ['sale-confirmation'] };
}
function row(label, value) {
  return `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}
function detailsTable(rows) {
  return `<table role="presentation" cellspacing="0" cellpadding="6">${rows.map(([label, value]) => row(label, value)).join('')}</table>`;
}

function buildPizzaPartyConfirmations({ paymentId, date, email, name, phone, address, mealTime, pizzaRequests, addOnGuests = 0, amountCents }) {
  if (!paymentId || !/^\S+@\S+\.\S+$/.test(String(email || ''))) throw new Error('confirmation-payment-and-email-required');
  const details = [
    ['Booking', 'Local Effort Pizza Party'], ['Requested date', clean(date)], ['Preferred meal time', clean(mealTime)],
    ['Additional guests', String(Number(addOnGuests) || 0)], ['Amount paid', money(amountCents)], ['Square payment reference', paymentId],
  ];
  const customer = {
    ...payloadBase(), to: [{ email }], subject: `Pizza Party deposit confirmed — ${clean(date)}`,
    htmlContent: shell(`<h1>Pizza Party deposit received</h1><p>Thank you${name ? `, ${escapeHtml(name)}` : ''}. Your payment has been received for your Local Effort Pizza Party booking. We will follow up to confirm logistics and finalize details.</p>${detailsTable(details)}<p>Contact phone: ${escapeHtml(clean(phone))}<br>Event address: ${addressHtml(address)}<br>Pizza requests: ${escapeHtml(clean(pizzaRequests))}</p>`),
    textContent: `Your Local Effort Pizza Party deposit has been received. We will follow up to confirm logistics and finalize details.\n${details.map(([key, value]) => `${key}: ${value}`).join('\n')}\nName: ${clean(name)}\nPhone: ${clean(phone)}\nAddress: ${addressText(address)}\nPizza requests: ${clean(pizzaRequests)}\nReply to this email or contact ${CONTACT}.`,
  };
  const owner = {
    ...payloadBase(), to: [{ email: CONTACT }], subject: `Pizza Party booking paid — ${clean(date)}`,
    htmlContent: shell(`<h1>New paid Pizza Party booking</h1><p>Payment is confirmed. Follow up with the customer to confirm logistics and finalize details.</p>${detailsTable([['Customer', clean(name)], ['Customer email', email], ['Phone', clean(phone)], ['Event address', addressText(address)], ...details, ['Pizza requests', clean(pizzaRequests)]])}`),
    textContent: `New paid Local Effort Pizza Party booking. Follow up to confirm logistics and finalize details.\nCustomer: ${clean(name)}\nCustomer email: ${email}\nPhone: ${clean(phone)}\nAddress: ${addressText(address)}\n${details.map(([key, value]) => `${key}: ${value}`).join('\n')}\nPizza requests: ${clean(pizzaRequests)}.`,
  };
  return [{ role: 'customer', payload: customer }, { role: 'owner', payload: owner }];
}

function buildChezGarageConfirmations({ paymentId, date, name, email, phone, address, guestCount, notes, amountCents }) {
  if (!paymentId || !/^\S+@\S+\.\S+$/.test(String(email || ''))) throw new Error('confirmation-payment-and-email-required');
  const details = [
    ['Booking', 'Chez Garage at Home — date-hold deposit'], ['Event date', clean(date)], ['Guest count', clean(guestCount)],
    ['Event address', addressText(address)], ['Deposit received', money(amountCents)], ['Square payment reference', paymentId],
  ];
  const customer = {
    ...payloadBase(), to: [{ email }], subject: `Chez Garage at Home deposit confirmed — ${clean(date)}`,
    htmlContent: shell(`<h1>Your Chez Garage at Home deposit is confirmed</h1><p>Thank you${name ? `, ${escapeHtml(name)}` : ''}. We have received your date-hold deposit. A chef will reach out to plan the menu and event. Menu choices determine the final cost; the existing estimate is $25–$45 per person. Chez Garage is intended for up to 40 guests; contact us if your group may be larger. We will follow up with next steps.</p>${detailsTable(details)}<p>Contact phone: ${escapeHtml(clean(phone))}<br>Notes: ${escapeHtml(clean(notes))}</p>`),
    textContent: `Your Chez Garage at Home date-hold deposit is confirmed. A chef will reach out to plan the menu and event. Menu choices determine final costs; the existing estimate is $25–$45 per person. Chez Garage is intended for up to 40 guests; contact us if your group may be larger. We will follow up with next steps.\n${details.map(([key, value]) => `${key}: ${value}`).join('\n')}\nCustomer: ${clean(name)}\nPhone: ${clean(phone)}\nNotes: ${clean(notes)}\nReply to this email or contact ${CONTACT}.`,
  };
  const owner = {
    ...payloadBase(), to: [{ email: CONTACT }], subject: `Chez Garage at Home booking paid — ${clean(date)}`,
    htmlContent: shell(`<h1>New paid Chez Garage at Home booking</h1><p>Follow up with the customer to plan the menu and event. Menu choices determine final costs; the existing estimate is $25–$45 per person. Chez Garage is intended for up to 40 guests.</p>${detailsTable([['Customer', clean(name)], ['Customer email', email], ['Phone', clean(phone)], ...details, ['Notes', clean(notes)]])}`),
    textContent: `New paid Chez Garage at Home booking. Follow up with the customer to plan the menu and event. Menu choices determine final costs; the existing estimate is $25–$45 per person. Chez Garage is intended for up to 40 guests.\nCustomer: ${clean(name)}\nCustomer email: ${email}\nPhone: ${clean(phone)}\n${details.map(([key, value]) => `${key}: ${value}`).join('\n')}\nNotes: ${clean(notes)}.`,
  };
  return [{ role: 'customer', payload: customer }, { role: 'owner', payload: owner }];
}

async function queuePizzaPartyConfirmations({ paymentId, emailOutboxService, ...details }) {
  return queueStoreConfirmations({
    confirmations: buildPizzaPartyConfirmations({ ...details, paymentId }),
    paymentId,
    sale: 'pizza-party',
    emailOutboxService,
  });
}

async function queueChezGarageConfirmations({ paymentId, emailOutboxService, ...details }) {
  return queueStoreConfirmations({
    confirmations: buildChezGarageConfirmations({ ...details, paymentId }),
    paymentId,
    sale: 'chez-garage-at-home',
    emailOutboxService,
  });
}

async function queueStoreConfirmations({ confirmations, paymentId, sale, emailOutboxService }) {
  if (!emailOutboxService) throw new Error('confirmation-outbox-required');
  const ids = [];
  for (const { role, payload } of confirmations) {
    const result = await emailOutboxService.enqueue({
      payload,
      idempotencyKey: `${sale}-confirmation:${paymentId}:${role}:v1`,
      category: 'transactional',
      source: 'sale-confirmation',
      context: { sale, paymentId, role },
    });
    ids.push(result?.id);
  }
  try {
    await emailOutboxService.processBatch({ ids, limit: ids.length });
    return { queued: true, processingPending: false };
  } catch (error) {
    console.error('[sale-confirmation] queued jobs immediate processing failed', {
      paymentId, sale, error: error?.message || error,
    });
    return { queued: true, processingPending: true, processingError: error?.message || String(error) };
  }
}

module.exports = {
  buildPizzaPartyConfirmations,
  buildChezGarageConfirmations,
  queuePizzaPartyConfirmations,
  queueChezGarageConfirmations,
  queueStoreConfirmations,
};
