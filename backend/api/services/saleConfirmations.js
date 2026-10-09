const venues = require('../../../src/config/venues.json').venues;
const SITE = 'https://www.localeffortfood.com';
const CONTACT = 'yum@localeffortfood.com';
const INSTAGRAM = 'https://www.instagram.com/localeffort/';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100);

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'To be confirmed';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'To be confirmed';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
function formatTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '');
  if (!match) return value ? `${value} (Central time)` : 'To be confirmed with you';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'} Central time`;
}

function buildEventConfirmations({ estimate, amountCents, ownerEmail = CONTACT, senderEmail = process.env.SENDER_EMAIL || CONTACT }) {
  if (!estimate?.id || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(estimate.contactEmail || '')) throw new Error('confirmation-contact-email-required');
  const venue = venues.find((entry) => entry.slug === estimate.location);
  const address = venue?.address;
  const place = venue ? `${venue.nickname} — ${[address?.street, address?.locality, address?.region, address?.postalCode].filter(v => v && !v.startsWith('TODO')).join(', ')}` : (estimate.location && estimate.location !== 'client' ? estimate.location : 'Your location — address to be confirmed');
  const date = formatDate(estimate.eventDate);
  const rows = [['Date', date], ['Time', formatTime(estimate.eventTime)], ['Place', place], ['Guests', estimate.guestCount || 'To be confirmed'], ['Deposit received', money(amountCents)], ['Booking reference', estimate.id]];
  const image = venue?.photos?.hero ? `${SITE}${venue.photos.hero}` : null;
  const intro = `Thank you${estimate.contactName ? `, ${estimate.contactName}` : ''}. We’ve received your deposit and confirmed your booking${venue ? ` at ${venue.nickname}` : ''}.`;
  const contact = `For updates or changes, reply to this email or contact ${CONTACT}.`;
  const table = (entries) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${entries.map(([key, value]) => `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid #ddd;vertical-align:top;width:135px"><strong>${escapeHtml(key)}</strong></td><td style="padding:10px 0;border-bottom:1px solid #ddd">${escapeHtml(value)}</td></tr>`).join('')}</table>`;
  const shell = (body) => `<!doctype html><html><body style="margin:0;background:#f3ebe5;color:#24201c;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:28px 22px"><p style="font-size:18px;margin:0 0 22px"><strong>Local Effort</strong></p>${body}<p style="line-height:1.6">${contact.replace(CONTACT, `<a href="mailto:${CONTACT}" style="color:inherit">${CONTACT}</a>`)}</p><p><a href="${SITE}" style="color:inherit">Website</a> &nbsp;·&nbsp; <a href="${INSTAGRAM}" style="color:inherit">Instagram</a></p></div></body></html>`;
  const base = { sender: { email: senderEmail, name: 'Local Effort' }, replyTo: { email: CONTACT, name: 'Local Effort' }, tags: ['sale-confirmation', 'event-booking'] };
  const details = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const ownerRows = [['Customer', estimate.contactName || 'Not provided'], ['Email', estimate.contactEmail], ['Phone', estimate.contactPhone || 'Not provided'], ...rows, ['Service style', estimate.serviceStyle || 'To be confirmed'], ['Notes', estimate.notes || 'None']];
  return [
    { role: 'customer', payload: { ...base, to: [{ email: estimate.contactEmail }], subject: `Booking confirmed${venue ? ` — ${venue.nickname}` : ''} — ${date}`, htmlContent: shell(`${image ? `<img src="${image}" width="556" alt="${escapeHtml(venue.nickname)} event space" style="display:block;width:100%;height:auto;margin-bottom:24px">` : ''}<h1 style="font-size:24px;font-weight:normal">Your booking is confirmed</h1><p style="line-height:1.6">${escapeHtml(intro)}</p>${table(rows)}`), textContent: `${intro}\n\n${details}\n\n${contact}\nWebsite: ${SITE}\nInstagram: ${INSTAGRAM}` } },
    { role: 'owner', payload: { ...base, to: [{ email: ownerEmail }], subject: `New confirmed booking${venue ? ` — ${venue.nickname}` : ''} — ${date}`, htmlContent: shell(`<h1 style="font-size:24px;font-weight:normal">New confirmed booking</h1>${table(ownerRows)}`), textContent: `New confirmed booking — Local Effort\n\n${ownerRows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nWebsite: ${SITE}\nInstagram: ${INSTAGRAM}` } },
  ];
}

async function queueEventConfirmations({ estimate, amountCents, emailOutboxService }) {
  if (!emailOutboxService) throw new Error('confirmation-outbox-required');
  const ids = [];
  for (const { role, payload } of buildEventConfirmations({ estimate, amountCents })) {
    const queued = await emailOutboxService.enqueue({ payload, idempotencyKey: `event-confirmation:${estimate.id}:${role}:v1`, category: 'transactional', source: 'sale-confirmation', context: { estimateId: estimate.id, role } });
    ids.push(queued.id);
  }
  // Await the immediate attempt on serverless; persisted failures are retried by cron.
  await emailOutboxService.processBatch({ ids, limit: ids.length });
}
module.exports = { buildEventConfirmations, queueEventConfirmations };
