#!/usr/bin/env node
/**
 * Builds the Pizza on Smith drop announcement as an email and (optionally)
 * saves it as a Brevo DRAFT campaign. It never sends or schedules anything.
 *
 *   node scripts/build-pizza-drop-email.cjs             # render .tmp/pizza-drop-email.html only
 *   node scripts/build-pizza-drop-email.cjs --draft     # create/update the Brevo draft
 *
 * Copy, drop window, fulfillment text, prices and product text come from the
 * live Sanity-backed storefront record (/api/store/products?store=pizza-on-smith),
 * the same record the page and checkout read, including the product photos.
 * Nothing here restates a CMS fact.
 * Values for colour come from src/styles/brand-tokens.css; email clients cannot
 * resolve CSS variables, so the hex values are inlined.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.localeffortfood.com';
const ENDPOINT = `${SITE}/api/store/products?store=pizza-on-smith`;
const TIME_ZONE = 'America/Chicago';
const CAMPAIGN_NAME = 'Pizza on Smith - Drop 1 announcement (DRAFT)';
const SENDER = { name: 'Local Effort Cooperative', email: 'yum@localeffortfood.com' };
const REPLY_TO = 'yum@localeffortfood.com';
const TARGET_LIST_NAME = 'Pizza Drop 1 | Target';

// brand-tokens.css
const C = {
  sheet: '#F3EBE5', // --brand-sheet
  ink: '#3A2E3F', // --brand-ink
  muted: '#6B5F6E', // ink at 72% over sheet
  line: '#D4CBC7', // ink at 22% over sheet
  linen: '#F1E3D8', // --brand-linen
  void: '#18130C', // --brand-void
  oxide: '#A26354', // --brand-oxide
  mount: '#E4E4D8', // --brand-mount
};
const DISPLAY = "'General Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const BODY = "'Source Sans 3','Source Sans Pro',Helvetica,Arial,sans-serif";
const MONO = "'Office Code Pro','Courier New',Courier,monospace";

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

// Sanity text may be a plain string or Portable Text blocks.
function paragraphs(value) {
  if (Array.isArray(value)) {
    return value
      .filter((b) => b && b._type === 'block')
      .map((b) => (b.children || []).map((c) => c.text || '').join(''))
      .filter((t) => t.trim());
  }
  return String(value || '')
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);
}
const plain = (value) => paragraphs(value).join(' ');

const money = (cents) => `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
const moment = (ms) => `${dayFmt.format(ms)} · ${timeFmt.format(ms)}`;

// Sanity image CDN: crop to ratio at delivery, JPEG for email clients.
const photo = (url, width, ratio) => {
  const [w, h] = ratio.split(':').map(Number);
  return `${url.split('?')[0]}?w=${width}&h=${Math.round((width * h) / w)}&fit=crop&fm=jpg&q=80`;
};

const font = (family, size, color, extra = '') =>
  `font-family:${family};font-size:${size}px;color:${color};${extra}`;

function button(href, label, { bg, fg }) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${bg}" style="background:${bg};">
<a href="${esc(href)}" style="display:inline-block;padding:14px 22px;${font(DISPLAY, 16, fg, 'font-weight:600;text-decoration:none;')}">${esc(label)}</a></td></tr></table>`;
}

function rule(color = C.line) {
  return `<tr><td style="padding:0 28px;"><div style="border-top:1px solid ${color};font-size:0;line-height:0;">&nbsp;</div></td></tr>`;
}

function build({ page, products }) {
  const opens = Date.parse(page.dropOpensAt);
  const closes = Date.parse(page.dropClosesAt);
  const now = Date.now();
  const state = now < opens ? 'upcoming' : now <= closes ? 'open' : 'closed';
  const ORDER_URL = `${SITE}/pizza-on-smith#order`;
  const oil = products.find((p) => /olive/i.test(p.title) || /olive/i.test(p.id));
  const pizzas = products.filter((p) => p !== oil);

  const lead = {
    upcoming: 'Ordering opens soon',
    open: 'Ordering is open',
    closed: 'This drop is closed',
  }[state];

  const ledger = [
    ['ordering opens', moment(opens)],
    ['ordering closes', moment(closes)],
    ['fulfillment', page.fulfillmentLabel],
  ].filter(([, v]) => v);

  const intro = paragraphs(page.introduction).map(
    (t, i) =>
      `<p style="margin:${i ? '12px' : '0'} 0 0;${font(BODY, 18, C.muted, 'line-height:1.55;')}">${esc(t)}</p>`
  ).join('');

  const productRows = pizzas.map((p) => {
    const six = /cheese-6/.test(p.id);
    const price = `${money(p.price)}${six ? ` <span style="${font(MONO, 12, C.muted)}">/ ${money(Math.round(p.price / 6))} per pizza</span>` : ''}`;
    return `<tr><td style="padding:18px 0;border-top:1px solid ${C.line};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top"><div style="${font(DISPLAY, 20, C.ink, 'font-weight:650;line-height:1.2;')}">${esc(p.title)}</div>
${p.shortDescription ? `<div style="margin-top:4px;${font(BODY, 15, C.muted, 'line-height:1.5;')}">${esc(p.shortDescription)}</div>` : ''}</td>
<td valign="top" align="right" style="white-space:nowrap;padding-left:16px;${font(MONO, 17, C.ink)}">${price}</td>
</tr></table></td></tr>`;
  }).join('');

  const oilRow = oil
    ? `<tr><td style="padding:16px;background:${C.mount};border-top:1px solid ${C.line};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top"><div style="${font(DISPLAY, 16, C.ink, 'font-weight:650;')}">${esc(oil.title)}</div>
<div style="margin-top:4px;${font(BODY, 14, C.muted, 'line-height:1.5;')}">${esc(plain(page.oliveOilDescription))}</div></td>
<td valign="top" align="right" style="white-space:nowrap;padding-left:16px;${font(MONO, 15, C.ink)}">${money(oil.price)}</td>
</tr></table></td></tr>`
    : '';

  const story = paragraphs(page.storyText).map(
    (t, i) => `<p style="margin:${i ? '12px' : '0'} 0 0;${font(BODY, 16, C.muted, 'line-height:1.6;')}">${esc(t)}</p>`
  ).join('');

  const notes = (page.notes || []).map(
    (n) => `<tr><td style="padding:16px 0;border-top:1px solid ${C.line};">
<div style="${font(DISPLAY, 18, C.ink, 'font-weight:650;line-height:1.25;')}">${esc(n.heading)}</div>
<div style="margin-top:4px;${font(BODY, 15, C.muted, 'line-height:1.6;')}">${esc(n.text)}</div></td></tr>`
  ).join('');

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(page.pickupAddress)}`;

  // Photos are the product images Sanity serves with the live record (CMS-owned).
  const withImage = pizzas.filter((p, i, all) => p.images && p.images[0] && all.findIndex((q) => q.images && q.images[0] === p.images[0]) === i);
  const main = withImage[0] ? { url: withImage[0].images[0], alt: withImage[0].title } : null;
  const second = withImage[1] ? { url: withImage[1].images[0], alt: withImage[1].title } : null;
  const img = (p, w, ratio, displayW) =>
    `<img src="${esc(photo(p.url, w, ratio))}" width="${displayW}" alt="${esc(p.alt)}" style="display:block;width:100%;max-width:${displayW}px;height:auto;border:0;">`;

  const preheader = esc(plain(page.introduction).slice(0, 140));

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><title>${esc(page.headline)}</title></head>
<body style="margin:0;padding:0;background:${C.sheet};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.sheet}" style="background:${C.sheet};"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

<tr><td style="padding:22px 28px 0;"><a href="${SITE}/" style="${font(DISPLAY, 14, C.ink, 'font-weight:600;text-decoration:none;letter-spacing:0.01em;')}">local effort cooperative</a></td></tr>
<tr><td style="padding:12px 28px 0;"><div style="border-top:1px solid ${C.ink};font-size:0;line-height:0;">&nbsp;</div></td></tr>

<tr><td style="padding:34px 28px 0;"><h1 style="margin:0;${font(DISPLAY, 40, C.ink, 'font-weight:650;line-height:1.04;letter-spacing:-0.03em;')}">${esc(page.headline)}</h1></td></tr>
<tr><td style="padding:18px 28px 28px;">${intro}</td></tr>

<tr><td style="padding:0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.void}" style="background:${C.void};"><tr><td style="padding:28px 24px 24px;">
<div style="${font(DISPLAY, 30, C.linen, 'font-weight:650;line-height:1.1;letter-spacing:-0.02em;')}">${esc(lead)}</div>
<div style="margin:16px 0 18px;border-top:1px solid ${C.oxide};font-size:0;line-height:0;">&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${ledger.map(([l, v]) => `<tr><td valign="top" style="padding:5px 0;${font(MONO, 12, '#B8A99C')}">${esc(l)}</td><td valign="top" align="right" style="padding:5px 0;${font(MONO, 13, C.linen)}">${esc(v)}</td></tr>`).join('\n')}
</table>
${state === 'open' ? `<div style="margin-top:22px;">${button(ORDER_URL, 'Choose your pizzas', { bg: C.linen, fg: C.void })}</div>` : ''}
</td></tr></table></td></tr>

${main ? `<tr><td style="padding:28px 28px 0;">${img(main, 1088, '4:5', 544)}</td></tr>` : ''}

<tr><td style="padding:36px 28px 6px;"><h2 style="margin:0;${font(DISPLAY, 28, C.ink, 'font-weight:650;line-height:1.1;letter-spacing:-0.02em;')}">${esc(page.orderHeading)}</h2>
${page.orderIntroduction ? `<div style="margin-top:6px;${font(BODY, 15, C.muted)}">${esc(plain(page.orderIntroduction))}</div>` : ''}</td></tr>
<tr><td style="padding:12px 28px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${productRows}${oilRow}</table></td></tr>

<tr><td style="padding:24px 28px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:16px 0;border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};">
<div style="${font(DISPLAY, 17, C.ink, 'font-weight:650;')}">${esc(page.pickupHeading)}</div>
<div style="margin-top:4px;${font(BODY, 15, C.muted)}">${esc(page.pickupAddress)}</div>
<div style="margin-top:6px;"><a href="${esc(mapsUrl)}" style="${font(MONO, 13, C.oxide, 'text-decoration:underline;')}">Get directions ↗</a></div>
</td></tr></table></td></tr>

${state === 'open' ? `<tr><td style="padding:24px 28px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ink}" style="background:${C.ink};"><tr><td align="center" style="padding:0;"><a href="${ORDER_URL}" style="display:block;padding:18px 22px;${font(DISPLAY, 17, C.linen, 'font-weight:600;text-decoration:none;text-align:center;')}">Choose your pizzas</a></td></tr></table></td></tr>` : ''}

${second ? `<tr><td style="padding:40px 28px 0;">${img(second, 1088, '3:2', 544)}</td></tr>` : ''}
<tr><td style="padding:28px 28px 0;"><h2 style="margin:0 0 12px;${font(DISPLAY, 26, C.ink, 'font-weight:650;line-height:1.12;letter-spacing:-0.02em;')}">${esc(String(page.storyHeading).trim())}</h2>${story}</td></tr>

${state === 'open' && page.returnToOrderLabel ? `<tr><td style="padding:24px 28px 0;"><a href="${ORDER_URL}" style="${font(MONO, 13, C.oxide, 'text-decoration:underline;')}">${esc(page.returnToOrderLabel)}</a></td></tr>` : ''}

<tr><td style="padding:36px 28px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${notes}<tr><td style="border-top:1px solid ${C.line};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

<tr><td style="padding:28px 28px 40px;${font(BODY, 13, C.muted, 'line-height:1.6;')}">
<div>Questions? Reply to this email or write <a href="mailto:${REPLY_TO}" style="color:${C.ink};">${REPLY_TO}</a>.</div>
<div style="margin-top:12px;">You are receiving this from Local Effort Cooperative because you have ordered from us, joined one of our lists, or asked about our food. Local Effort Cooperative, ${esc(page.pickupAddress)}.</div>
<div style="margin-top:12px;"><a href="{{ mirror }}" style="color:${C.muted};">View in browser</a> &nbsp;·&nbsp; <a href="{{ unsubscribe }}" style="color:${C.muted};">Unsubscribe</a></div>
</td></tr>

</table></td></tr></table></body></html>`;

  const subject = {
    open: `${page.headline.replace(/\.$/, '')} · order by ${dayFmt.format(closes)}`,
    upcoming: `${page.headline.replace(/\.$/, '')} · ordering opens ${dayFmt.format(opens)}`,
    closed: page.headline,
  }[state];

  return { html, subject, state };
}

async function fetchRecord() {
  const res = await fetch(ENDPOINT);
  if (!res.ok) throw new Error(`${ENDPOINT} -> ${res.status}`);
  const json = await res.json();
  if (!json.page || !Array.isArray(json.products)) throw new Error('Unexpected storefront payload');
  return json;
}

function brevoKey() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^\s*BREVO_API_KEY\s*=\s*"?([^"\r\n]+)"?/m);
    if (m) return m[1].trim();
  }
  throw new Error('BREVO_API_KEY not found');
}

async function saveDraft({ html, subject }) {
  const headers = { 'api-key': brevoKey(), accept: 'application/json', 'content-type': 'application/json' };
  const call = async (method, route, body) => {
    const res = await fetch(`https://api.brevo.com/v3${route}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  };
  const lists = await call('GET', '/contacts/lists?limit=50&offset=0');
  const list = (lists.lists || []).find((l) => l.name === TARGET_LIST_NAME);
  if (!list) throw new Error(`List "${TARGET_LIST_NAME}" not found; run scripts/brevo-consolidate-audiences.cjs --apply`);
  const senders = await call('GET', '/senders');
  if (!(senders.senders || []).some((s) => s.email === SENDER.email && s.active)) {
    throw new Error(`Brevo sender ${SENDER.email} is not active`);
  }
  const drafts = await call('GET', '/emailCampaigns?limit=100&status=draft');
  const existing = (drafts.campaigns || []).find((c) => c.name === CAMPAIGN_NAME);
  const payload = { name: CAMPAIGN_NAME, subject, sender: SENDER, replyTo: REPLY_TO, htmlContent: html, recipients: { listIds: [list.id] } };
  let id = existing && existing.id;
  if (id) await call('PUT', `/emailCampaigns/${id}`, payload);
  else id = (await call('POST', '/emailCampaigns', payload)).id;
  const v = await call('GET', `/emailCampaigns/${id}`);
  if (v.status !== 'draft') throw new Error(`Campaign ${id} is ${v.status}, expected draft`);
  console.log({ id, status: v.status, scheduledAt: v.scheduledAt || null, sender: v.sender, subject: v.subject, lists: (v.recipients && v.recipients.lists) || [] });
}

(async () => {
  const record = await fetchRecord();
  const out = build(record);
  const file = path.join(ROOT, '.tmp', 'pizza-drop-email.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out.html);
  console.log({ file, subject: out.subject, dropState: out.state, bytes: out.html.length });
  if (process.argv.includes('--draft')) await saveDraft(out);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
