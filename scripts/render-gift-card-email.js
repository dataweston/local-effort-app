#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const {
  buildRecipientHtml,
} = require('../api-handlers/store/gift-card-email');

const outputPath = path.resolve(__dirname, '../emails/digital-gift-card-demo.html');

const sample = {
  amountLabel: '$250.00',
  recipientName: 'Jordan Guest',
  buyerName: 'Taylor Host',
  code: 'LOCAL-LOVE-2024',
  note: 'Cannot wait to celebrate with you soon! Save this for a cozy dinner. ❤️',
  deliveryTarget: 'recipient',
  cardType: 'digital',
  instructions: [
    'Reply to this email or message hello@localeffortfood.com to plan your menu.',
    'Share this gift code when you book your experience.',
    'Get ready for seasonal plates crafted just for you.',
  ],
  physicalDetails: null,
  sendOn: new Date('2024-12-24T15:00:00.000Z').toISOString(),
};

const html = buildRecipientHtml(sample);

const header = '<!-- Auto-generated demo for stakeholders. Run `node scripts/render-gift-card-email.js` to refresh. -->\n';

fs.writeFileSync(outputPath, `${header}${html}`);

console.log(`Gift card email demo saved to ${outputPath}`);
