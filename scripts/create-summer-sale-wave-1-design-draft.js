#!/usr/bin/env node
/**
 * Create or refresh the Summer Sale Wave 1 DESIGN-ONLY draft in Brevo.
 *
 * The campaign intentionally contains placeholder copy only. It is never
 * scheduled and this script never calls Brevo's send endpoints.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local'), override: false });

const CAMPAIGN_NAME = 'Summer Sale 2026 - Wave 1 - design draft';
const SUBJECT = 'Lorem ipsum dolor sit amet';
const WAVE_1_LIST_ID = 21;

const HOME_HERO = 'https://res.cloudinary.com/dokyhfvyd/image/upload/f_auto,q_auto,w_1200/v1759456148/vjuesai2mxfavpq9d2df.jpg';
const JULY_DINNER = 'https://res.cloudinary.com/dokyhfvyd/image/upload/c_fill,w_900,h_900,q_auto,f_jpg/s7fngt44mwpptmgoawxc';
const CHEZ_GARAGE = 'https://www.localeffortfood.com/images/chez-garage-hero.jpg';
const RIJKS_APPLES = 'https://iiif.micr.io/jaTqd/full/900,/0/default.jpg';
const RIJKS_FLOWERS = 'https://iiif.micr.io/GMEXG/full/900,/0/default.jpg';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${SUBJECT}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; display:block; height:auto; line-height:100%; outline:none; text-decoration:none; }
    table { border-collapse:collapse !important; }
    @media screen and (max-width:660px) {
      .shell { width:100% !important; }
      .pad { padding-left:20px !important; padding-right:20px !important; }
      .stack, .stack-cell { display:block !important; width:100% !important; }
      .stack-cell { padding-left:0 !important; padding-right:0 !important; padding-bottom:14px !important; }
      .hero-title { font-size:42px !important; line-height:0.98 !important; }
      .art-pad { padding:22px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#e4e4d8;color:#3a2e3f;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#e4e4d8;">
    <tr><td align="center" style="padding:24px 10px;">
      <table role="presentation" class="shell" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:640px;background:#f3ebe5;border:1px solid #3a2e3f;">
        <tr><td style="padding:7px;border-bottom:1px solid #3a2e3f;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #3a2e3f;">
            <tr>
              <td width="33.33%" style="padding:8px 10px;border-right:1px solid #3a2e3f;font-family:'Courier New',monospace;font-size:10px;line-height:1.2;color:#3a2e3f;">Lorem ipsum</td>
              <td width="33.33%" align="center" style="padding:8px 10px;border-right:1px solid #3a2e3f;font-family:'Courier New',monospace;font-size:10px;line-height:1.2;color:#3a2e3f;">Dolor sit</td>
              <td width="33.33%" align="right" style="padding:8px 10px;font-family:'Courier New',monospace;font-size:10px;line-height:1.2;color:#3a2e3f;">Amet 2026</td>
            </tr>
          </table>
        </td></tr>

        <tr><td class="pad" align="center" style="padding:34px 34px 18px;">
          <img src="https://www.localeffortfood.com/gallery/logo.png" width="138" alt="Local Effort Cooperative" style="width:138px;max-width:100%;">
        </td></tr>

        <tr><td class="pad" style="padding:0 26px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf2;border:1px solid #3a2e3f;box-shadow:8px 8px 0 #ac4c4b;">
            <tr><td style="padding:7px;">
              <img src="${HOME_HERO}" width="572" alt="A Local Effort dinner gathered around a table" style="width:100%;max-width:572px;">
            </td></tr>
          </table>
        </td></tr>

        <tr><td class="pad" style="padding:20px 46px 30px;">
          <h1 class="hero-title" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:54px;line-height:0.96;font-weight:400;letter-spacing:-2px;color:#3a2e3f;">Lorem ipsum<br><em style="color:#8f3031;">dolor sit amet.</em></h1>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#3a2e3f;">Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        </td></tr>

        <tr><td class="pad" style="padding:0 26px 34px;">
          <table role="presentation" class="stack" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td class="stack-cell" width="41%" valign="top" style="width:41%;padding-right:8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1e3d8;border:1px solid #3a2e3f;">
                  <tr><td style="padding:6px;"><img src="${JULY_DINNER}" width="224" alt="Red summer tomatoes from the July Dinner page" style="width:100%;max-width:224px;"></td></tr>
                  <tr><td style="padding:8px 9px;border-top:1px solid #3a2e3f;font-family:'Courier New',monospace;font-size:9px;line-height:1.4;">Lorem ipsum &middot; dolor sit</td></tr>
                </table>
              </td>
              <td class="stack-cell" width="59%" valign="top" style="width:59%;padding-left:8px;padding-top:28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1e3d8;border:1px solid #3a2e3f;box-shadow:6px 6px 0 #6e9bb0;">
                  <tr><td style="padding:6px;"><img src="${CHEZ_GARAGE}" width="316" alt="Chez Garage facade" style="width:100%;max-width:316px;"></td></tr>
                  <tr><td style="padding:8px 9px;border-top:1px solid #3a2e3f;font-family:'Courier New',monospace;font-size:9px;line-height:1.4;">Consectetur &middot; adipiscing elit</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Gift-card module: email-safe translation of the About-tab specimen sheet. -->
        <tr><td data-module="gift-card" style="background:#18130c;padding:34px 26px;">
          <table role="presentation" class="stack" width="100%" cellpadding="0" cellspacing="0" style="border:3px double #f3ebe5;">
            <tr>
              <td class="stack-cell" width="49%" valign="middle" style="width:49%;padding:12px;border-right:1px solid #f3ebe5;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf2;border:1px solid #f3ebe5;">
                  <tr><td style="padding:6px;"><img src="${RIJKS_APPLES}" width="250" alt="Appel (Malus domestica), Anselmus Boetius de Boodt, Rijksmuseum" style="width:100%;max-width:250px;"></td></tr>
                </table>
              </td>
              <td class="stack-cell" width="51%" valign="middle" style="width:51%;padding:20px;">
                <p style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:10px;line-height:1.4;color:#f35c2b;">Lorem ipsum / no. 01</p>
                <h2 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:29px;line-height:1.05;font-weight:400;color:#f3ebe5;">Lorem ipsum dolor sit amet.</h2>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#f1e3d8;">Consectetur adipiscing elit, sed do eiusmod tempor incididunt.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f3ebe5;border-bottom:1px solid #f3ebe5;">
                  <tr>
                    <td width="33.33%" align="center" style="padding:8px 3px;border-right:1px solid #f3ebe5;font-family:'Courier New',monospace;font-size:10px;color:#f3ebe5;">$100</td>
                    <td width="33.33%" align="center" style="padding:8px 3px;border-right:1px solid #f3ebe5;font-family:'Courier New',monospace;font-size:10px;color:#f3ebe5;">$250</td>
                    <td width="33.33%" align="center" style="padding:8px 3px;font-family:'Courier New',monospace;font-size:10px;color:#f3ebe5;">$500</td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:17px;"><tr><td bgcolor="#f3ebe5" style="border:1px solid #f3ebe5;">
                  <a href="https://www.localeffortfood.com/#about" style="display:inline-block;padding:12px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#18130c;text-decoration:none;">Lorem ipsum&nbsp;&nbsp;&rarr;</a>
                </td></tr></table>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td class="art-pad" style="padding:34px 34px 10px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #3a2e3f;border-bottom:1px solid #3a2e3f;">
            <tr>
              <td width="62%" valign="middle" style="width:62%;padding:14px 14px 14px 0;">
                <h2 style="margin:0 0 9px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.1;font-weight:400;color:#3a2e3f;">Ut enim ad minima veniam.</h2>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#3a2e3f;">Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse.</p>
              </td>
              <td width="38%" align="right" style="width:38%;padding:14px 0 14px 14px;">
                <img src="${RIJKS_FLOWERS}" width="196" alt="Flowers in a Glass Vase with a Butterfly, Herman Henstenburgh, Rijksmuseum" style="width:100%;max-width:196px;border:1px solid #3a2e3f;">
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding:26px 34px 38px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#8f3031" style="border:1px solid #3a2e3f;box-shadow:5px 5px 0 #3a2e3f;">
            <a href="https://www.localeffortfood.com/sale" style="display:inline-block;padding:15px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#fffaf2;text-decoration:none;">Lorem ipsum&nbsp;&nbsp;&rarr;</a>
          </td></tr></table>
        </td></tr>

        <tr><td style="padding:7px;border-top:1px solid #3a2e3f;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #3a2e3f;">
            <tr>
              <td style="padding:9px 10px;font-family:'Courier New',monospace;font-size:9px;line-height:1.5;color:#3a2e3f;">Lorem ipsum dolor sit amet.</td>
              <td align="right" style="padding:9px 10px;font-family:'Courier New',monospace;font-size:9px;line-height:1.5;"><a href="{{ unsubscribe }}" style="color:#3a2e3f;">Lorem ipsum</a></td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <!-- Art references retained in markup: Rijksmuseum jaTqd and GMEXG. -->
</body>
</html>`;

async function brevoJson(url, options, headers) {
  const response = await fetch(url, { ...options, headers });
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  if (process.argv.includes('--dry-run')) {
    process.stdout.write(`${html}\n`);
    return;
  }

  const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured');
  const headers = { 'api-key': apiKey, accept: 'application/json', 'content-type': 'application/json' };

  const senderData = await brevoJson('https://api.brevo.com/v3/senders', {}, headers);
  const sender = (senderData.senders || []).find((item) => item.active) || (senderData.senders || [])[0];
  if (!sender) throw new Error('No verified Brevo sender is available');

  const drafts = await brevoJson('https://api.brevo.com/v3/emailCampaigns?limit=100&status=draft', {}, headers);
  const existing = (drafts.campaigns || []).find((campaign) => campaign.name === CAMPAIGN_NAME);
  const payload = existing
    ? { htmlContent: html, recipients: { listIds: [WAVE_1_LIST_ID] } }
    : {
      name: CAMPAIGN_NAME,
      subject: SUBJECT,
      type: 'classic',
      sender: { name: 'Local Effort Cooperative', email: sender.email },
      replyTo: 'yum@localeffortfood.com',
      htmlContent: html,
      recipients: { listIds: [WAVE_1_LIST_ID] },
    };

  const id = existing?.id;
  const result = await brevoJson(
    id ? `https://api.brevo.com/v3/emailCampaigns/${id}` : 'https://api.brevo.com/v3/emailCampaigns',
    { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) },
    headers,
  );
  const campaignId = id || result.id;
  const verified = await brevoJson(`https://api.brevo.com/v3/emailCampaigns/${campaignId}`, {}, headers);

  if (verified.status !== 'draft') throw new Error(`Campaign ${campaignId} is not a draft (status: ${verified.status})`);
  const recipientLists = verified.recipients?.lists || [];
  const listIds = recipientLists.map((list) => Number(
    typeof list === 'object' ? (list.id ?? list.listId) : list,
  ));
  if (!listIds.includes(WAVE_1_LIST_ID)) {
    throw new Error(`Campaign ${campaignId} is not assigned to Wave 1 list ${WAVE_1_LIST_ID}; received ${JSON.stringify(verified.recipients)}`);
  }
  if (!verified.htmlContent?.includes('data-module="gift-card"')) {
    throw new Error(`Campaign ${campaignId} did not retain the gift-card module`);
  }

  process.stdout.write(JSON.stringify({
    action: existing ? 'updated' : 'created',
    id: campaignId,
    name: verified.name,
    subject: verified.subject,
    status: verified.status,
    recipients: verified.recipients?.lists || [],
    scheduledAt: verified.scheduledAt || null,
    sender: verified.sender,
  }, null, 2));
}

main().catch((error) => {
  process.stderr.write(`[summer-sale-wave-1-design] ${error?.message || error}\n`);
  process.exit(1);
});
