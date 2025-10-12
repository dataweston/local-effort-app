import 'dotenv/config';
import fetch from 'node-fetch';

const {
  BREVO_API_KEY,
  BREVO_TEMPLATE_NAME,
  BREVO_CAMPAIGN_NAME,
  BREVO_CAMPAIGN_SUBJECT,
  BREVO_PREHEADER,
  BREVO_SENDER_NAME,
  BREVO_SENDER_EMAIL,
  BREVO_TO_FIELD,
  BREVO_LIST_IDS,
  BREVO_SEGMENT_IDS,
  TEST_RECIPIENTS
} = process.env;

if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY missing');

// parse list/segment ids
const listIds = (BREVO_LIST_IDS || '').split(',').map(s => Number(s.trim())).filter(Boolean);
const segmentIds = (BREVO_SEGMENT_IDS || '').split(',').map(s => Number(s.trim())).filter(Boolean);

const H = {
  accept: 'application/json',
  'api-key': BREVO_API_KEY,
  'content-type': 'application/json'
};

// read HTML from stdin (piped)
const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const html = Buffer.concat(chunks).toString('utf8');

// 1) find existing SMTP template by name (transactional template for reuse)
async function findTemplateByName(name) {
  const r = await fetch('https://api.brevo.com/v3/smtp/templates?limit=100', { headers: H });
  const j = await r.json();
  const t = (j.templates || []).find(x => x.name === name);
  return t || null;
}

// 2) create/update SMTP template
async function upsertSmtpTemplate(name, htmlContent) {
  const existing = await findTemplateByName(name);
  if (existing) {
    const url = `https://api.brevo.com/v3/smtp/templates/${existing.id}`;
    const body = {
      htmlContent,
      subject: BREVO_CAMPAIGN_SUBJECT || 'Update',
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
      replyTo: BREVO_SENDER_EMAIL
    };
    const r = await fetch(url, { method: 'PUT', headers: H, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`Update template failed: ${r.status} ${await r.text()}`);
    return existing.id;
  } else {
    const url = `https://api.brevo.com/v3/smtp/templates`;
    const body = {
      templateName: name,
      htmlContent,
      subject: BREVO_CAMPAIGN_SUBJECT || 'Update',
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
      replyTo: BREVO_SENDER_EMAIL,
      isActive: true
    };
    const r = await fetch(url, { method: 'POST', headers: H, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`Create template failed: ${r.status} ${await r.text()}`);
    const j = await r.json();
    return j.id;
  }
}

// 3) find existing campaign by name (draft campaign)
async function findCampaignByName(name) {
  const r = await fetch('https://api.brevo.com/v3/emailCampaigns?type=classic&limit=100', { headers: H });
  const j = await r.json();
  return (j.campaigns || []).find(x => x.name === name) || null;
}

// 4) create/update campaign with the same HTML
async function upsertCampaign(name, htmlContent) {
  const payload = {
    name,
    subject: BREVO_CAMPAIGN_SUBJECT,
    previewText: BREVO_PREHEADER || '',
    sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
    toField: BREVO_TO_FIELD || '{{ contact.EMAIL }}',
    htmlContent,
    recipients: {
      ...(listIds.length ? { listIds } : {}),
      ...(segmentIds.length ? { segmentIds } : {})
    },
    inlineImageActivation: false,
    mirrorActive: false,
    recurring: false,
    type: 'classic'
  };

  const existing = await findCampaignByName(name);
  if (existing) {
    const url = `https://api.brevo.com/v3/emailCampaigns/${existing.id}`;
    const r = await fetch(url, { method: 'PUT', headers: H, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(`Update campaign failed: ${r.status} ${await r.text()}`);
    return existing.id;
  } else {
    const url = `https://api.brevo.com/v3/emailCampaigns`;
    const r = await fetch(url, { method: 'POST', headers: H, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(`Create campaign failed: ${r.status} ${await r.text()}`);
    const j = await r.json();
    return j.id;
  }
}

// 5) optional: send a transactional test using SMTP endpoint (not the campaign)
//    This lets you eyeball the exact HTML before scheduling/sending the campaign.
async function sendTransactionalTest(htmlContent) {
  const recipients = (TEST_RECIPIENTS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!recipients.length) return;

  const url = `https://api.brevo.com/v3/smtp/email`;
  const body = {
    subject: `[TEST] ${BREVO_CAMPAIGN_SUBJECT}`,
    htmlContent: htmlContent,
    sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
    to: recipients.map(email => ({ email }))
  };
  const r = await fetch(url, { method: 'POST', headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Test send failed: ${r.status} ${await r.text()}`);
}

const templateId = await upsertSmtpTemplate(BREVO_TEMPLATE_NAME || 'Local Effort Update', html);
let campaignId = null;
if (listIds.length || segmentIds.length) {
  campaignId = await upsertCampaign(BREVO_CAMPAIGN_NAME || 'Local Effort Campaign', html);
}
await sendTransactionalTest(html);

console.log(JSON.stringify({ templateId, campaignId, note: campaignId ? null : "No lists/segments configured, campaign not created" }, null, 2));