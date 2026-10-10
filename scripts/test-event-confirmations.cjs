#!/usr/bin/env node
// Owner-only preview/send through the same builder and Brevo transport as production.
const fs = require('node:fs');
const { buildEventConfirmations } = require('../backend/api/services/saleConfirmations');
const { createBrevoService } = require('../backend/api/services/brevo');
const recipient = 'yum@localeffortfood.com';
const estimate = { id: 'TEST-FIREHOUSE-NOT-A-BOOKING', location: 'firehouse', contactName: 'Weston', contactEmail: recipient, eventDate: '2026-11-14', eventTime: '18:00', guestCount: 16, serviceStyle: 'family_style', notes: 'Owner-only email test. No booking or payment was created.' };
(async () => {
  fs.mkdirSync('.tmp/firehouse-confirmations', { recursive: true });
  const messages = buildEventConfirmations({ estimate, amountCents: 35800, ownerEmail: recipient });
  const results = [];
  for (const { role, payload } of messages) {
    payload.to = [{ email: recipient }];
    payload.subject = `[TEST — ${role}] ${payload.subject}`;
    payload.htmlContent = payload.htmlContent.replace('<h1 ', '<p><strong>TEST ONLY — no booking or payment was created.</strong></p><h1 ');
    payload.textContent = `TEST ONLY — no booking or payment was created.\n\n${payload.textContent}`;
    fs.writeFileSync(`.tmp/firehouse-confirmations/${role}.html`, payload.htmlContent);
    if (process.argv.includes('--send')) {
      const response = await createBrevoService().sendEmail(payload);
      const result = await response.json();
      results.push({ role, to: recipient, subject: payload.subject, messageId: result.messageId, sentAt: new Date().toISOString() });
      fs.writeFileSync('.tmp/firehouse-confirmations/send-results.json', JSON.stringify(results, null, 2));
      console.log(JSON.stringify(results.at(-1)));
    }
  }
  if (!process.argv.includes('--send')) console.log('Rendered customer and owner previews. Use --send with BREVO_API_KEY to send both only to yum@localeffortfood.com.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
