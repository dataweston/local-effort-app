const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;

function buildWinterDinnerConfirmationFacts({ customer = {}, dietaryRestrictions, drinkMenu, ticketPrice, ticketCount, registrationId }) {
  const contact = { name: customer.name || 'Not specified', email: customer.email || '{{customerEmail}}', phone: customer.phone || 'Not specified' };
  const beverageText = drinkMenu === 'wine' ? 'with curated wine pairings' : 'with artisanal non-alcoholic beverage pairings';
  const dietaryText = dietaryRestrictions ? `\n\nDietary Restrictions/Allergies: ${dietaryRestrictions}` : '';
  return {
    flow: 'winter-dinner', title: 'Winter Dinner Ticket Confirmation', amountCents: Number(ticketPrice), customer: { ...customer },
    details: { Event: 'December 21, 2025 at 6:00 PM', Location: 'Local Effort Space, 1024 E 38th St, Minneapolis, MN', Quantity: ticketCount, 'Beverage pairing': drinkMenu === 'wine' ? 'Wine Pairing' : 'Non-Alcoholic Pairing', 'Dietary restrictions': dietaryRestrictions || 'None specified' },
    confirmationTemplates: [
      { role: 'customer', payload: {
        to: [{ email: contact.email, name: contact.name }], sender: { email: SENDER_EMAIL, name: 'Local Effort' },
        subject: '✨ Your Winter Dinner Ticket Confirmation',
        textContent: `Dear ${contact.name},

Thank you for purchasing a ticket to our Winter Dinner! We're thrilled to have you join us for an unforgettable evening.

═══════════════════════════════════════
EVENT DETAILS
═══════════════════════════════════════

Date: December 21, 2025
Time: 6:00 PM
Location: Local Effort Space
Address: 1024 E 38th St, Minneapolis, MN

Your ticket includes a multi-course seasonal dinner ${beverageText}.${dietaryText}

═══════════════════════════════════════
YOUR CONFIRMATION
═══════════════════════════════════════

Name: ${contact.name}
Email: ${contact.email}
Phone: ${contact.phone}
Quantity: ${ticketCount}
Ticket Price: $${(ticketPrice / 100).toFixed(2)}
Payment ID: {{paymentId}}

═══════════════════════════════════════

If you have any questions or need to update your dietary restrictions, please reply to this email or call us.

We look forward to seeing you!

Warmly,
The Local Effort Team`,
      } },
      { role: 'owner', payload: {
        to: [{ email: TEAM_EMAIL }], sender: { email: SENDER_EMAIL, name: 'Local Effort Winter Dinner' },
        subject: `🎫 New Ticket: ${contact.name} - Winter Dinner`,
        textContent: `🎫 NEW WINTER DINNER TICKET PURCHASED

═══════════════════════════════════════
CUSTOMER INFORMATION
═══════════════════════════════════════

Name: ${contact.name}
Email: ${contact.email}
Phone: ${contact.phone}

═══════════════════════════════════════
TICKET DETAILS
═══════════════════════════════════════

Price: $${(ticketPrice / 100).toFixed(2)}
Quantity: ${ticketCount}
Beverage Pairing: ${drinkMenu === 'wine' ? 'Wine Pairing' : 'Non-Alcoholic Pairing'}
Dietary Restrictions: ${dietaryRestrictions || 'None specified'}

Payment ID: {{paymentId}}
${registrationId ? `Registration ID: ${registrationId}` : ''}

═══════════════════════════════════════

Event: December 21, 2025 at 6:00 PM
Location: Local Effort Space`,
      } },
    ],
  };
}

module.exports = { buildWinterDinnerConfirmationFacts };
