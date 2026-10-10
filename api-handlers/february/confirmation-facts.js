const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;

function buildFebruaryConfirmationFacts({ date, guests, amountCents, preferredTime, dietaryNotes, notes, customer = {}, address = {} }) {
  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const fullAddress = address.line1 ? `${address.line1}${address.line2 ? `, ${address.line2}` : ''}, ${address.city}, ${address.state} ${address.postal}` : 'Not specified';
  const contact = { name: customer.name || 'Not specified', email: customer.email || '{{customerEmail}}', phone: customer.phone || 'Not specified' };
  return {
    flow: 'february',
    title: 'February in-home chef dinner',
    amountCents,
    customer: { ...customer },
    details: { Date: formattedDate, 'Preferred time': preferredTime || 'Not specified', 'Guest count': guests, Address: fullAddress, 'Dietary notes': dietaryNotes || 'None', 'Additional notes': notes || 'None', Total: `$${(amountCents / 100).toFixed(2)}` },
    confirmationTemplates: [
      { role: 'customer', payload: {
        to: [{ email: contact.email, name: contact.name }],
        sender: { email: SENDER_EMAIL, name: 'Local Effort' },
        subject: `February dinner confirmed - ${formattedDate}`,
        textContent: [
          'Thanks for booking your February in-home chef dinner.', '',
          `Date: ${formattedDate}`, `Preferred time: ${preferredTime || 'Not specified'}`, `Guest count: ${guests}`,
          `Address: ${fullAddress}`, `Dietary notes: ${dietaryNotes || 'None'}`, `Additional notes: ${notes || 'None'}`, '',
          'Payment ID: {{paymentId}}', `Total: $${(amountCents / 100).toFixed(2)}`, '',
          'We will follow up within 24 hours to confirm menu details and logistics.',
        ].join('\n'),
      } },
      { role: 'owner', payload: {
        to: [{ email: TEAM_EMAIL }], sender: { email: SENDER_EMAIL, name: 'Local Effort' },
        subject: `February dinner booked - ${contact.name}`,
        textContent: [
          'NEW FEBRUARY DINNER BOOKING', '', `Date: ${formattedDate}`, `Preferred time: ${preferredTime || 'Not specified'}`,
          `Guest count: ${guests}`, `Total: $${(amountCents / 100).toFixed(2)}`, '',
          `Customer: ${contact.name}`, `Email: ${contact.email}`, `Phone: ${contact.phone}`, `Address: ${fullAddress}`,
          `Dietary notes: ${dietaryNotes || 'None'}`, `Additional notes: ${notes || 'None'}`, '', 'Payment ID: {{paymentId}}',
        ].join('\n'),
      } },
    ],
  };
}

module.exports = { buildFebruaryConfirmationFacts };
