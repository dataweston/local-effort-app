#!/usr/bin/env node
/**
 * Create (or update) the Chez Garage media pitch as a DRAFT campaign in Brevo.
 *
 * Draft only. It sets no scheduledAt and never calls sendNow, so nothing leaves
 * Brevo until a human opens the campaign and sends it — which is the rule in
 * AGENTS.md: every message goes through Brevo, and the owner reviews before it
 * reaches a human.
 *
 *   node scripts/create-chez-garage-media-draft.js --dry-run   print the HTML
 *   node scripts/create-chez-garage-media-draft.js             create the draft
 *
 * Re-running updates the existing draft (matched by campaign name) instead of
 * stacking duplicates.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local'), override: false });

const CAMPAIGN_NAME = 'Chez Garage — media pitch (Edina, Jul 30–Aug 2 2026)';
const MEDIA_LIST_ID = 8; // "media"
const PAGE_URL = 'https://www.localeffortfood.com/chez-garage';
const RELEASE_URL = 'https://www.localeffortfood.com/releases';

// Only used if the campaign has to be created from scratch. Once it exists, the
// subject and preview text are the owner's — set in the Brevo UI — and the
// update path below leaves both alone.
const SUBJECT = 'Chez Garage, a hyper-casual concept';

const ANGLES = [
  'Hyper-casual dining: what happens when chef technique is decoupled from the occasion, the table setting, and the price.',
  'A worker-owned kitchen that offers every staff member equity, running pop-ups instead of a fixed dining room.',
  '100% Midwest sourcing in a format — pub pizza and takeaway — usually built on commodity supply chains.',
  'The suburban pop-up: why a garage in Edina rather than a storefront in Minneapolis.',
];

const FACTS = [
  ['What', 'Chez Garage, a hyper-casual dining pop-up from Local Effort Cooperative'],
  ['When', 'Thursday, July 30 – Sunday, August 2, 2026'],
  ['Where', 'Edina, Minnesota'],
  ['Menu', '12" pub pizzas made to order ($13–$15), cherry-rubbed pork belly ($32), ramp oil ($24), frozen pizzas to bake at home ($24–$74)'],
  ['Ordering', 'Online for pickup or local delivery; $75 delivery minimum'],
  ['Also', 'Local Effort brings the chef and the oven to a host’s own driveway for up to 40 guests, $25–$45 per person'],
];

const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f3ebe5;font-family:Georgia,'Times New Roman',serif;color:#18130c;line-height:1.6;">
    <div style="max-width:620px;margin:0 auto;background:#fffaf2;padding:32px;">

      <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a2319;">
        Local Effort Cooperative &middot; Media
      </p>
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.2;letter-spacing:-0.02em;">
        Chez Garage: hyper-casual dining in Edina, July 30&ndash;August 2
      </h1>

      <p style="margin:0 0 16px;">Hi {{contact.FIRSTNAME|default:there}},</p>

      <p style="margin:0 0 16px;">
        Local Effort Cooperative is opening <strong>Chez Garage</strong> this week &mdash; a super-casual
        popup concept run out of a garage in Edina. Guests order online, pull up, and leave with dinner
        and with prepared food for the rest of the week.
      </p>

      <p style="margin:0 0 16px;">
        We call it <strong>hyper-casual dining</strong>: the food is the only formal thing about it. The
        same Minnesota-grown ingredients and chef technique we put into private dinners and weekly meal
        prep, handed to you in a driveway on a paper plate.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-collapse:collapse;">
        ${FACTS.map(([label, value]) => `<tr>
          <td style="padding:8px 12px 8px 0;border-top:1px solid #e7ddcc;vertical-align:top;width:96px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7a2319;">${label}</td>
          <td style="padding:8px 0;border-top:1px solid #e7ddcc;vertical-align:top;font-size:15px;">${value}</td>
        </tr>`).join('\n        ')}
      </table>

      <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a2319;">
        Angles we can help with
      </p>
      <ul style="margin:0 0 24px;padding-left:20px;">
        ${ANGLES.map((angle) => `<li style="margin:0 0 8px;">${angle}</li>`).join('\n        ')}
      </ul>

      <p style="margin:0 0 24px;">
        Full menu, dates, and ordering: <a href="${PAGE_URL}" style="color:#7a2319;">${PAGE_URL}</a><br />
        Press release, fast facts, and leadership bios: <a href="${RELEASE_URL}" style="color:#7a2319;">${RELEASE_URL}</a>
      </p>

      <p style="margin:0 0 24px;">
        Happy to arrange a visit during the run, send high-resolution photography, or put you on the phone
        with one of the chefs. Just reply to this note.
      </p>

      <p style="margin:0 0 4px;">Weston Smith</p>
      <p style="margin:0 0 24px;font-size:14px;color:#686058;">
        Chef &amp; Co-Founder, Local Effort Cooperative<br />
        <a href="mailto:yum@localeffortfood.com" style="color:#7a2319;">yum@localeffortfood.com</a> &middot;
        Minneapolis, MN
      </p>

      <p style="margin:0;padding-top:16px;border-top:1px solid #e7ddcc;font-size:12px;color:#686058;">
        Local Effort Cooperative is a worker-owned personal chef and catering team in Minneapolis&ndash;St. Paul,
        cooking from Minnesota and Midwest farms since 2022. Every staff member is offered equity.
        <br /><a href="{{ unsubscribe }}" style="color:#686058;">Unsubscribe</a>
      </p>
    </div>
  </body>
</html>`;

async function main() {
  if (process.argv.includes('--dry-run')) {
    process.stdout.write(`Campaign: ${CAMPAIGN_NAME}\nSubject:  ${SUBJECT}\nList:     ${MEDIA_LIST_ID}\n\n${html}\n`);
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured');
  const headers = { 'api-key': apiKey, accept: 'application/json', 'content-type': 'application/json' };

  const sendersRes = await fetch('https://api.brevo.com/v3/senders', { headers });
  const senders = await sendersRes.json();
  const sender = (senders.senders || []).find((s) => s.active) || (senders.senders || [])[0];
  if (!sender) throw new Error('No verified Brevo sender available');

  const existingRes = await fetch('https://api.brevo.com/v3/emailCampaigns?limit=100&status=draft', { headers });
  const existing = await existingRes.json();
  const match = (existing.campaigns || []).find((c) => c.name === CAMPAIGN_NAME);

  // Updating sends the body and nothing else. Subject and preview text belong
  // to whoever last edited them in Brevo — re-running this must not overwrite
  // an owner's subject line with the placeholder below.
  const payload = match
    ? { htmlContent: html }
    : {
      name: CAMPAIGN_NAME,
      subject: SUBJECT,
      type: 'classic',
      sender: { name: 'Local Effort Cooperative', email: sender.email },
      replyTo: 'yum@localeffortfood.com',
      htmlContent: html,
      recipients: { listIds: [MEDIA_LIST_ID] },
      // No scheduledAt: Brevo keeps this in draft until a human sends it.
    };

  const res = await fetch(
    match ? `https://api.brevo.com/v3/emailCampaigns/${match.id}` : 'https://api.brevo.com/v3/emailCampaigns',
    { method: match ? 'PUT' : 'POST', headers, body: JSON.stringify(payload) },
  );

  if (!res.ok) {
    throw new Error(`Brevo ${res.status}: ${await res.text().catch(() => '')}`);
  }

  const body = res.status === 204 ? { id: match.id } : await res.json();
  process.stdout.write(
    match
      ? `[chez-garage-pitch] updated body of draft campaign ${body.id} (subject left untouched)\n`
      : `[chez-garage-pitch] created draft campaign ${body.id}\n`
        + `[chez-garage-pitch] sender ${sender.email}, list ${MEDIA_LIST_ID}, status DRAFT (not sent)\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`[chez-garage-pitch] ${error?.message || error}\n`);
  process.exit(1);
});
