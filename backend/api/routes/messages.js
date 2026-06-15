const express = require('express');
const crypto = require('crypto');

function icsEscape(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatDateBasic(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function buildICS({ uid, summary, description, location, startDate, endDate, allDay = true, method = 'PUBLISH' }) {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `METHOD:${method}`,
    'PRODID:-//Local Effort//Event Request//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
  ];
  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateBasic(startDate)}`);
    if (endDate) lines.push(`DTEND;VALUE=DATE:${formatDateBasic(endDate)}`);
  } else {
    const dt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    lines.push(`DTSTART:${dt(startDate)}`);
    if (endDate) lines.push(`DTEND:${dt(endDate)}`);
  }
  if (summary) lines.push(`SUMMARY:${icsEscape(summary)}`);
  if (location) lines.push(`LOCATION:${icsEscape(location)}`);
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function safeDateFromInput(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
}

function hashKey(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createMessagesRouter({ logger, brevoService, getSanityClient, db, getSupabase, emailOutboxService, auditLogger }) {
  const router = express.Router();
  const { upsertContact, sendEmail, getHeaders, blacklistContact } = brevoService;
  const hasOutbox = !!(emailOutboxService && typeof emailOutboxService.enqueue === 'function');
  const submitRateBuckets = new Map();
  const sensitiveSubmitTypes = new Set(['feedback', 'meal-prep-waitlist', 'subscribe', 'event-request', 'food-truck']);
  const parseListIds = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((entry) => parseInt(String(entry).trim(), 10))
        .filter((entry) => Number.isInteger(entry) && entry > 0);
    }
    if (typeof value !== 'string') return [];
    return value
      .split(',')
      .map((entry) => parseInt(entry.trim(), 10))
      .filter((entry) => Number.isInteger(entry) && entry > 0);
  };
  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const defaultListIds = parseListIds(process.env.BREVO_NEWSLETTER_LIST_IDS || process.env.BREVO_LIST_IDS || '');
  const tokenTtlHours = Number.parseInt(process.env.NEWSLETTER_CONFIRM_TTL_HOURS || '72', 10) || 72;
  const waitlistConfirmTemplateId = Number.parseInt(process.env.BREVO_MEAL_PREP_WAITLIST_TEMPLATE_ID || '27', 10) || null;
  const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://localeffortfood.com').replace(/\/+$/, '');
  const unsubscribeSecret = process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.SANITY_WEBHOOK_SECRET || process.env.BLOG_WEBHOOK_SECRET || 'dev-unsubscribe-secret';

  const logAudit = (event, details = {}) => {
    if (typeof auditLogger === 'function') {
      try {
        auditLogger(event, details);
        return;
      } catch (err) {
        if (logger?.warn) logger.warn({ err }, 'audit logger failed');
      }
    }
    if (logger?.info) logger.info({ event, ...details }, 'messages audit');
  };

  const parseAdminEmails = (value) => String(value || '')
    .split(/[\s,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const isTeamEmail = (email) => {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return false;
    const configured = parseAdminEmails(
      process.env.ADMIN_EMAILS ||
        process.env.VITE_ADMIN_EMAILS ||
        process.env.NEXT_PUBLIC_ADMIN_EMAILS
    );
    const adminEmails = configured.length > 0
      ? configured
      : ['dataweston@gmail.com', 'colsen03@gmail.com'];
    return adminEmails.includes(normalized) || normalized.endsWith('@localeffortfood.com');
  };

  const requireTeamUser = async (req, res, next) => {
    const authHeader = String(req.headers.authorization || '');
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const supabase = getSupabase ? getSupabase() : null;
    if (!match || !supabase) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(match[1].trim());
      if (error || !isTeamEmail(user?.email)) return res.status(403).json({ error: 'Forbidden' });
      req.user = { email: user.email, uid: user.id };
      return next();
    } catch (_err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };

  const subscriberDocId = (email) => {
    const safe = String(email || '').toLowerCase().replace(/@/g, '-at-').replace(/\./g, '-').replace(/[^a-z0-9-]/g, '-');
    return `email-subscriber-${safe}`;
  };

  const createToken = () => crypto.randomBytes(24).toString('hex');
  const hashToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');
  const signUnsubscribeToken = (email) => crypto.createHmac('sha256', unsubscribeSecret).update(String(email || '').toLowerCase()).digest('hex');
  const timingSafeEq = (left, right) => {
    if (typeof left !== 'string' || typeof right !== 'string') return false;
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  };

  const basePublicUrl = () => (process.env.PUBLIC_URL || 'https://localeffortfood.com').replace(/\/$/, '');

  const normalizeType = (value) => String(value || 'general').trim().toLowerCase().slice(0, 80) || 'general';
  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const readTrimmed = (value, max = 1000) => {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, max);
  };
  const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  };
  const bumpRateLimit = ({ key, windowMs, max }) => {
    const now = Date.now();
    const current = submitRateBuckets.get(key);
    if (!current || current.expiresAt <= now) {
      submitRateBuckets.set(key, { count: 1, expiresAt: now + windowMs });
      return { limited: false, retryAfter: 0 };
    }
    if (current.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
      return { limited: true, retryAfter };
    }
    current.count += 1;
    if (submitRateBuckets.size > 12000) {
      for (const [bucketKey, bucket] of submitRateBuckets.entries()) {
        if (!bucket || bucket.expiresAt <= now) submitRateBuckets.delete(bucketKey);
      }
    }
    return { limited: false, retryAfter: 0 };
  };
  const checkSubmitRateLimit = ({ req, type, email }) => {
    const ip = getClientIp(req);
    const isSensitive = sensitiveSubmitTypes.has(type);
    const checks = [
      { key: `messages-submit:ip:${ip}`, windowMs: 10 * 60 * 1000, max: 40 },
      {
        key: `messages-submit:ip-type:${ip}:${type}`,
        windowMs: isSensitive ? 10 * 60 * 1000 : 5 * 60 * 1000,
        max: isSensitive ? 6 : 20,
      },
    ];
    const emailValue = normalizeEmail(email);
    if (emailValue) {
      checks.push({
        key: `messages-submit:email-type:${emailValue}:${type}`,
        windowMs: 10 * 60 * 1000,
        max: isSensitive ? 4 : 12,
      });
    }
    let retryAfter = 0;
    for (const check of checks) {
      const result = bumpRateLimit(check);
      if (result.limited) {
        retryAfter = Math.max(retryAfter, result.retryAfter);
      }
    }
    return retryAfter > 0
      ? { limited: true, retryAfter, ip }
      : { limited: false, retryAfter: 0, ip };
  };

  const renderConfirmHtml = ({ title, body }) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(title)}</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a;padding:24px;">
  <main style="max-width:640px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
    <h1 style="margin:0 0 12px 0;font-size:1.5rem;">${escapeHtml(title)}</h1>
    <p style="margin:0;line-height:1.5;">${escapeHtml(body)}</p>
    <p style="margin-top:16px;"><a href="${basePublicUrl()}" style="color:#0f172a;">Return to Local Effort</a></p>
  </main>
</body>
</html>`;

  async function saveSubscriberState({ email, firstName, lastName, phone, source, listIds, status, tokenHash, tokenExpiresAt, confirmedAt, unsubscribedAt, suppressedAt, suppressionReason }) {
    const sc = getSanityClient ? getSanityClient() : null;
    if (!sc) return null;
    const id = subscriberDocId(email);
    const now = new Date().toISOString();
    await sc.createIfNotExists({
      _id: id,
      _type: 'emailSubscriber',
      email,
      createdAt: now,
    });
    const patch = {
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
      source: source || null,
      listIds: Array.isArray(listIds) ? listIds : defaultListIds,
      status: status || 'pending_double_opt_in',
      updatedAt: now,
      pendingTokenHash: tokenHash || null,
      tokenExpiresAt: tokenExpiresAt || null,
      confirmedAt: confirmedAt || null,
      unsubscribedAt: unsubscribedAt || null,
      suppressedAt: suppressedAt || null,
      suppressionReason: suppressionReason || null,
      unsubscribeToken: signUnsubscribeToken(email),
    };
    await sc.patch(id).set(patch).commit();
    return id;
  }

  const handleEmailError = (res, err, fallback) => {
    if (err && err.code === 'EMAIL_NOT_CONFIGURED') {
      return res.status(500).json({ error: 'Email service not configured' });
    }
    if (err && err.status) {
      return res.status(502).json({ error: fallback || 'Failed to send email', details: err.details || '' });
    }
    return res.status(500).json({ error: fallback || 'send-failed' });
  };

  router.post('/messages/submit', async (req, res) => {
    try {
      const body = req.body || {};
      const type = normalizeType(body.type);
      const name = readTrimmed(body.name, 200);
      const email = normalizeEmail(body.email);
      const phone = readTrimmed(body.phone, 80);
      const subject = readTrimmed(body.subject, 240);
      const message = readTrimmed(body.message, 12000);
      const sendCopy = !!body.sendCopy;
      const honeypot = readTrimmed(body.website, 255);
      const familySize = readTrimmed(body.familySize, 120);
      const children = readTrimmed(body.children, 400);
      const daysPerWeek = readTrimmed(body.daysPerWeek, 120);
      const mealsPerDay = readTrimmed(body.mealsPerDay, 120);
      const allergies = readTrimmed(body.allergies, 400);
      const questions = readTrimmed(body.questions, 1200);
      if (!message) return res.status(400).json({ error: 'Message is required' });

      // Silent success on honeypot hits to reduce bot retries.
      if (honeypot) {
        if (logger?.info) logger.info({ type, email, hasHoneypot: true }, 'messages submit suppressed by honeypot');
        return res.json({ ok: true, suppressed: true });
      }

      const rateLimit = checkSubmitRateLimit({ req, type, email });
      if (rateLimit.limited) {
        res.setHeader('Retry-After', String(rateLimit.retryAfter));
        return res.status(429).json({ error: 'rate-limit-exceeded', retryAfter: rateLimit.retryAfter });
      }

      if (type === 'feedback') {
        if (!email || !BASIC_EMAIL_REGEX.test(email)) {
          return res.status(400).json({ error: 'Feedback requires a valid email' });
        }
        if (message.length < 8) {
          return res.status(400).json({ error: 'Feedback message is too short' });
        }
      }

      if (type === 'meal-prep-waitlist') {
        if (!name || !email || !phone || !BASIC_EMAIL_REGEX.test(email)) {
          return res.status(400).json({ error: 'Waitlist requires name, email, and phone' });
        }
        if (!familySize || !daysPerWeek || !mealsPerDay) {
          return res.status(400).json({ error: 'Waitlist requires family size, days per week, and meals per day' });
        }
      }

      // Only upsert contact if email is provided
      if (email) {
        const [firstName, ...rest] = name.split(' ');
        await upsertContact({ email, firstName, lastName: rest.join(' '), phone });
      }

      const sc = getSanityClient ? getSanityClient() : null;
      let msgDoc = null;
      if (sc) {
        try {
          msgDoc = await sc.create({
            _type: 'message',
            direction: 'inbound',
            status: 'open',
            subject: subject || '(no subject)',
            bodyText: message,
            fromEmail: email || null,
            fromName: name || null,
            phone: phone || null,
            channel: 'email',
            inbox: 'general',
            messageType: type,
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          if (logger) logger.warn({ err: error }, 'failed to write message to sanity');
        }
      }

      // Store meal-prep-waitlist submissions in Supabase
      if (type === 'meal-prep-waitlist' && getSupabase) {
        const supabase = getSupabase();
        if (supabase) {
          try {
            const waitlistData = {
              name,
              email,
              phone: phone || null,
              family_size: familySize || null,
              children: children || null,
              days_per_week: daysPerWeek || null,
              meals_per_day: mealsPerDay || null,
              allergies: allergies || null,
              questions: questions || null,
              sanity_message_id: msgDoc?._id || null,
              status: 'pending',
            };
            const { error } = await supabase.from('meal_prep_waitlist').insert([waitlistData]);
            if (error) {
              if (logger) logger.warn({ err: error }, 'failed to store waitlist entry in supabase');
            }
          } catch (error) {
            if (logger) logger.warn({ err: error }, 'supabase waitlist insert error');
          }
        }
      }

      const teamEmail = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
      const senderEmail = process.env.SENDER_EMAIL || teamEmail;
      if (!teamEmail) return res.status(500).json({ error: 'No TEAM/SUPPORT inbox configured on server' });

      const fromDisplay = name || email || 'Anonymous';
      const safeMessage = escapeHtml(message);
      const htmlContent = `
        <p>New inquiry from <strong>${escapeHtml(fromDisplay)}</strong></p>
        ${email ? `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` : '<p><strong>Email:</strong> Not provided (anonymous)</p>'}
        ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
        <p><strong>Type:</strong> ${escapeHtml(type)}</p>
        <hr />
        <pre style="white-space:pre-wrap;font-family:inherit">${safeMessage}</pre>
      `;
      const payload = {
        to: [{ email: teamEmail }],
        sender: { email: senderEmail, name: 'Local Effort' },
        subject: subject || 'New inquiry',
        htmlContent,
        replyTo: email ? { email, name: name || email } : undefined,
        tags: ['inquiry', type].filter(Boolean),
        headers: msgDoc?._id ? { 'X-Message-Id': msgDoc._id } : undefined,
      };
      if (sendCopy && email) {
        payload.cc = [{ email, name: name || email }];
      }

      try {
        await sendEmail(payload);
      } catch (err) {
        return handleEmailError(res, err, 'Failed to send email');
      }

      // Send the client a branded waitlist confirmation with a link to the meal prep intake.
      // Non-fatal: the signup already succeeded above, so a confirmation failure is logged, not surfaced.
      if (type === 'meal-prep-waitlist' && email && waitlistConfirmTemplateId) {
        const [firstName] = String(name || '').trim().split(/\s+/);
        try {
          await sendEmail({
            to: [{ email, name: name || email }],
            sender: { email: senderEmail, name: 'Local Effort' },
            templateId: waitlistConfirmTemplateId,
            tags: ['meal-prep-waitlist', 'confirmation'],
            params: {
              FIRSTNAME: firstName || 'there',
              INTAKE_URL: `${siteUrl}/meal-prep-intake`,
              SITE_URL: siteUrl,
            },
          });
        } catch (err) {
          if (logger) logger.warn({ err, email }, 'failed to send meal-prep-waitlist confirmation email');
        }
      }

      return res.json({ ok: true, id: msgDoc?._id || null });
    } catch (err) {
      if (logger) logger.error({ err }, 'messages submit error');
      return res.status(500).json({ error: 'submit-failed' });
    }
  });

  router.post('/food-truck/inquire', async (req, res) => {
    try {
      const { name, email, phone, eventDate, cuisine, location, notes } = req.body || {};
      // Honeypot: real users never fill the hidden "website" field.
      if (readTrimmed(req.body?.website, 255)) {
        if (logger?.info) logger.info({ email, hasHoneypot: true }, 'food-truck inquiry suppressed by honeypot');
        return res.json({ ok: true, suppressed: true });
      }
      if (!name || !email || !phone || !eventDate || !location) {
        return res.status(400).json({ error: 'missing-required-fields' });
      }
      if (!BASIC_EMAIL_REGEX.test(normalizeEmail(email))) {
        return res.status(400).json({ error: 'invalid-email' });
      }
      const rateLimit = checkSubmitRateLimit({ req, type: 'food-truck', email });
      if (rateLimit.limited) {
        res.setHeader('Retry-After', String(rateLimit.retryAfter));
        return res.status(429).json({ error: 'rate-limit-exceeded', retryAfter: rateLimit.retryAfter });
      }

      const [firstName, ...rest] = String(name).trim().split(/\s+/);
      await upsertContact({ email, firstName: firstName || undefined, lastName: rest.join(' '), phone });

      const sc = getSanityClient ? getSanityClient() : null;
      let msgDoc = null;
      const textLines = [
        `Name / Business: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Event Date: ${eventDate}`,
        cuisine ? `Cuisine: ${cuisine}` : null,
        `Location: ${location}`,
        notes ? '' : null,
        notes ? `Notes: ${notes}` : null,
        '',
        'Minimum guarantee acknowledged: $1,200',
      ].filter((line) => line !== null).join('\n');

      if (sc) {
        try {
          msgDoc = await sc.create({
            _type: 'message',
            direction: 'inbound',
            status: 'open',
            subject: 'Food truck inquiry',
            bodyText: textLines,
            fromEmail: email,
            fromName: name,
            phone,
            channel: 'web',
            inbox: 'sales',
            messageType: 'food-truck',
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          if (logger) logger.warn({ err: error }, 'failed to write food truck inquiry to sanity');
        }
      }

      const teamEmail = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
      const senderEmail = process.env.SENDER_EMAIL || teamEmail;
      if (!teamEmail) return res.status(500).json({ error: 'No TEAM/SUPPORT inbox configured on server' });

      const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const htmlContent = `
        <p><strong>New food truck inquiry received</strong></p>
        <p><strong>Name / Business:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Event Date:</strong> ${escapeHtml(eventDate)}</p>
        ${cuisine ? `<p><strong>Cuisine:</strong> ${escapeHtml(cuisine)}</p>` : ''}
        <p><strong>Location:</strong><br />${escapeHtml(location).replace(/\n/g, '<br />')}</p>
        ${notes ? `<p><strong>Notes:</strong><br />${escapeHtml(notes).replace(/\n/g, '<br />')}</p>` : ''}
        <p style="margin-top:16px;"><em>Client acknowledged the $1,200 minimum guarantee.</em></p>
      `;

      const payload = {
        to: [{ email: teamEmail }],
        sender: { email: senderEmail, name: 'Local Effort' },
        subject: `Food Truck Inquiry${eventDate ? ` - ${eventDate}` : ''}`,
        htmlContent,
        replyTo: { email, name },
        tags: ['inquiry', 'food-truck'],
        headers: msgDoc?._id ? { 'X-Message-Id': msgDoc._id } : undefined,
      };

      try {
        await sendEmail(payload);
      } catch (err) {
        return handleEmailError(res, err, 'Failed to send email');
      }

      return res.json({ ok: true, id: msgDoc?._id || null });
    } catch (err) {
      if (logger) logger.error({ err }, 'food-truck inquiry error');
      return res.status(500).json({ error: 'submit-failed' });
    }
  });

  router.post('/subscribe', async (req, res) => {
    try {
      const { email, firstName, lastName, name, phone, listIds, source = 'home-about' } = req.body || {};
      // Honeypot: real users never fill the hidden "website" field.
      if (readTrimmed(req.body?.website, 255)) {
        if (logger?.info) logger.info({ source, hasHoneypot: true }, 'subscribe suppressed by honeypot');
        return res.json({ ok: true, status: 'pending_confirmation', suppressed: true });
      }
      const trimmedEmail = String(email || '').trim().toLowerCase();
      if (!trimmedEmail || !BASIC_EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Missing email' });
      }
      const rateLimit = checkSubmitRateLimit({ req, type: 'subscribe', email: trimmedEmail });
      if (rateLimit.limited) {
        res.setHeader('Retry-After', String(rateLimit.retryAfter));
        return res.status(429).json({ error: 'rate-limit-exceeded', retryAfter: rateLimit.retryAfter });
      }

      const adminEmail = process.env.NEWSLETTER_ADMIN_EMAIL
        || process.env.SUPPORT_INBOX_EMAIL
        || process.env.TEAM_INBOX_EMAIL
        || process.env.SENDER_EMAIL;
      const senderEmail = process.env.SENDER_EMAIL || adminEmail;
      if (!adminEmail || !senderEmail) {
        return res.status(500).json({ error: 'No admin inbox configured on server' });
      }

      const normalizedName = String(name || '').trim();
      const parsedFromName = normalizedName ? normalizedName.split(/\s+/) : [];
      const resolvedFirstName = firstName || parsedFromName[0] || '';
      const resolvedLastName = lastName || parsedFromName.slice(1).join(' ') || '';
      const resolvedListIds = (() => {
        const explicit = parseListIds(listIds);
        if (explicit.length > 0) return explicit;
        return defaultListIds;
      })();
      const sc = getSanityClient ? getSanityClient() : null;
      const existing = sc
        ? await sc.fetch('*[_type == "emailSubscriber" && email == $email][0]{ _id, status }', { email: trimmedEmail })
        : null;

      if (String(existing?.status || '').toLowerCase() === 'subscribed') {
        logAudit('newsletter.subscribe.already-subscribed', { email: trimmedEmail, source });
        return res.json({ ok: true, status: 'already-subscribed' });
      }

      const confirmToken = createToken();
      const confirmTokenHash = hashToken(confirmToken);
      const tokenExpiresAt = new Date(Date.now() + tokenTtlHours * 60 * 60 * 1000).toISOString();
      await saveSubscriberState({
        email: trimmedEmail,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        phone,
        source,
        listIds: resolvedListIds,
        status: 'pending_double_opt_in',
        tokenHash: confirmTokenHash,
        tokenExpiresAt,
      });

      const confirmLink = `${basePublicUrl()}/api/messages/subscribe/confirm?email=${encodeURIComponent(trimmedEmail)}&token=${encodeURIComponent(confirmToken)}`;
      const subscriberName = [resolvedFirstName, resolvedLastName].filter(Boolean).join(' ').trim() || 'there';
      const subject = 'Confirm your Local Effort newsletter subscription';
      const htmlContent = `
        <p>Hi ${escapeHtml(subscriberName)},</p>
        <p>Please confirm your subscription by clicking this secure link:</p>
        <p><a href="${confirmLink}">Confirm my subscription</a></p>
        <p>This link expires in ${tokenTtlHours} hours.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `;
      const idempotencyKey = `subscribe-confirm-${trimmedEmail}-${confirmTokenHash.slice(0, 20)}`;
      const confirmPayload = {
        to: [{ email: trimmedEmail, name: subscriberName }],
        sender: { email: senderEmail, name: 'Local Effort' },
        subject,
        htmlContent,
        tags: ['newsletter', 'double-opt-in'],
      };
      if (hasOutbox) {
        await emailOutboxService.enqueue({
          payload: confirmPayload,
          idempotencyKey,
          category: 'subscription',
          source: 'messages.subscribe',
          context: { email: trimmedEmail, source },
        });
        Promise.resolve()
          .then(() => emailOutboxService.processBatch({ limit: 5, maxAttempts: 5 }))
          .catch((queueErr) => {
            if (logger) logger.warn({ err: queueErr }, 'outbox opportunistic process failed after subscribe enqueue');
          });
      } else {
        await sendEmail(confirmPayload);
      }

      const adminHtmlContent = `
        <p><strong>Newsletter confirmation requested</strong></p>
        <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
        <p><strong>Name:</strong> ${escapeHtml(subscriberName)}</p>
        ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
        <p><strong>Source:</strong> ${escapeHtml(source)}</p>
        <p><strong>Target list IDs:</strong> ${resolvedListIds.length ? escapeHtml(resolvedListIds.join(', ')) : 'None configured'}</p>
      `;
      const adminPayload = {
        to: [{ email: adminEmail }],
        sender: { email: senderEmail, name: 'Local Effort' },
        replyTo: { email: trimmedEmail, name: subscriberName },
        subject: 'Newsletter subscription pending confirmation',
        htmlContent: adminHtmlContent,
        tags: ['newsletter', 'subscribe-pending'],
      };
      if (hasOutbox) {
        await emailOutboxService.enqueue({
          payload: adminPayload,
          idempotencyKey: `subscribe-admin-${trimmedEmail}-${Date.now().toString(36)}`,
          category: 'subscription',
          source: 'messages.subscribe',
          context: { email: trimmedEmail, source },
        });
      } else {
        await sendEmail(adminPayload);
      }

      logAudit('newsletter.subscribe.pending', { email: trimmedEmail, source, listCount: resolvedListIds.length });
      return res.json({ ok: true, status: 'pending_confirmation' });
    } catch (err) {
      if (logger) logger.error({ err }, 'subscribe error');
      return res.status(500).json({ error: 'subscribe-failed' });
    }
  });

  router.get('/messages/subscribe/confirm', async (req, res) => {
    try {
      const email = String(req.query?.email || '').trim().toLowerCase();
      const token = String(req.query?.token || '').trim();
      if (!email || !token) {
        const html = renderConfirmHtml({
          ok: false,
          title: 'Invalid confirmation link',
          body: 'This confirmation link is incomplete. Please request a new subscription email.',
        });
        return res.status(400).type('html').send(html);
      }

      const sc = getSanityClient ? getSanityClient() : null;
      if (!sc) return res.status(500).json({ error: 'sanity-not-configured' });
      const subscriber = await sc.fetch(
        '*[_type == "emailSubscriber" && email == $email][0]{ _id, email, firstName, lastName, phone, status, listIds, pendingTokenHash, tokenExpiresAt }',
        { email }
      );
      if (!subscriber?._id) {
        const html = renderConfirmHtml({
          ok: false,
          title: 'Subscription not found',
          body: 'We could not find your subscription request. Please subscribe again.',
        });
        return res.status(404).type('html').send(html);
      }

      const hashed = hashToken(token);
      const expiresAt = subscriber?.tokenExpiresAt ? new Date(subscriber.tokenExpiresAt).getTime() : 0;
      if (!timingSafeEq(hashed, String(subscriber?.pendingTokenHash || '')) || !expiresAt || expiresAt < Date.now()) {
        const html = renderConfirmHtml({
          ok: false,
          title: 'Confirmation link expired',
          body: 'This confirmation link is invalid or expired. Please submit your email again to receive a new link.',
        });
        return res.status(410).type('html').send(html);
      }

      const now = new Date().toISOString();
      await sc.patch(subscriber._id).set({
        status: 'subscribed',
        confirmedAt: now,
        updatedAt: now,
        pendingTokenHash: null,
        tokenExpiresAt: null,
      }).commit();

      try {
        await upsertContact({
          email,
          firstName: subscriber.firstName || undefined,
          lastName: subscriber.lastName || undefined,
          phone: subscriber.phone || undefined,
          listIds: Array.isArray(subscriber.listIds) && subscriber.listIds.length ? subscriber.listIds : defaultListIds,
        });
      } catch (brevoErr) {
        if (logger) logger.warn({ err: brevoErr, email }, 'failed to upsert contact after subscription confirmation');
      }

      logAudit('newsletter.subscribe.confirmed', { email });
      const html = renderConfirmHtml({
        ok: true,
        title: 'Subscription confirmed',
        body: 'Thanks for confirming. You are now subscribed to Local Effort updates.',
      });
      return res.status(200).type('html').send(html);
    } catch (err) {
      if (logger) logger.error({ err }, 'subscribe confirm error');
      const html = renderConfirmHtml({
        ok: false,
        title: 'Confirmation error',
        body: 'We were unable to confirm your subscription right now. Please try again shortly.',
      });
      return res.status(500).type('html').send(html);
    }
  });

  router.get('/messages/unsubscribe', async (req, res) => {
    try {
      const email = String(req.query?.email || '').trim().toLowerCase();
      const token = String(req.query?.token || '').trim();
      if (!email || !token || !timingSafeEq(token, signUnsubscribeToken(email))) {
        const html = renderConfirmHtml({
          ok: false,
          title: 'Invalid unsubscribe link',
          body: 'This unsubscribe link is invalid.',
        });
        return res.status(400).type('html').send(html);
      }

      const sc = getSanityClient ? getSanityClient() : null;
      if (!sc) return res.status(500).json({ error: 'sanity-not-configured' });
      const id = subscriberDocId(email);
      const now = new Date().toISOString();
      await sc.createIfNotExists({ _id: id, _type: 'emailSubscriber', email, createdAt: now });
      await sc.patch(id).set({
        email,
        status: 'unsubscribed',
        unsubscribedAt: now,
        updatedAt: now,
      }).commit();
      try {
        await blacklistContact({ email, emailBlacklisted: true });
      } catch (brevoErr) {
        if (logger) logger.warn({ err: brevoErr, email }, 'failed to blacklist contact on unsubscribe');
      }
      logAudit('newsletter.unsubscribe', { email });
      const html = renderConfirmHtml({
        ok: true,
        title: 'You are unsubscribed',
        body: 'Your email preferences have been updated. You will no longer receive these emails.',
      });
      return res.status(200).type('html').send(html);
    } catch (err) {
      if (logger) logger.error({ err }, 'unsubscribe error');
      const html = renderConfirmHtml({
        ok: false,
        title: 'Unsubscribe error',
        body: 'Unable to update your preference right now. Please try again later.',
      });
      return res.status(500).type('html').send(html);
    }
  });

  router.post('/events/request', async (req, res) => {
    try {
      const {
        firstName, lastName, email, phone,
        eventDate, city, state, zip,
        eventType, guestCount, notes,
        sendCopy = false,
      } = req.body || {};

      // Honeypot: real users never fill the hidden "website" field.
      if (readTrimmed(req.body?.website, 255)) {
        if (logger?.info) logger.info({ email, hasHoneypot: true }, 'event request suppressed by honeypot');
        return res.json({ ok: true, suppressed: true });
      }

      if (!email || !firstName || !lastName || !phone) {
        return res.status(400).json({ error: 'missing-required-fields' });
      }
      if (!BASIC_EMAIL_REGEX.test(normalizeEmail(email))) {
        return res.status(400).json({ error: 'invalid-email' });
      }
      const rateLimit = checkSubmitRateLimit({ req, type: 'event-request', email });
      if (rateLimit.limited) {
        res.setHeader('Retry-After', String(rateLimit.retryAfter));
        return res.status(429).json({ error: 'rate-limit-exceeded', retryAfter: rateLimit.retryAfter });
      }

      const name = `${firstName} ${lastName}`.trim();
      const startDate = safeDateFromInput(eventDate);
      const location = [city, state, zip].filter(Boolean).join(', ');
      const summary = [eventType || 'Event', guestCount ? `(${guestCount} guests)` : null, startDate ? `on ${eventDate}` : null]
        .filter(Boolean).join(' ');
      const details = [
        eventType ? `Event Type: ${eventType}` : null,
        startDate ? `Event Date: ${eventDate}` : null,
        guestCount ? `Estimated Guests: ${guestCount}` : null,
        location ? `Location: ${location}` : null,
        '',
        'Notes:',
        notes || '(none)'
      ].filter((line) => line !== null).join('\n');

      const [first, ...rest] = (name || '').split(' ');
      await upsertContact({ email, firstName: first, lastName: rest.join(' '), phone });

      const dedupeKey = hashKey(`${email.toLowerCase()}|${eventDate || ''}|${(city || '').toLowerCase()}`);
      let existingId = null;

      // Check for duplicates in Supabase first (preferred), fall back to Firebase
      if (getSupabase) {
        const supabase = getSupabase();
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('event_requests')
              .select('id, created_at')
              .eq('dedupe_key', dedupeKey)
              .order('created_at', { ascending: false })
              .limit(1);

            if (!error && data && data.length > 0) {
              const existing = data[0];
              const ts = new Date(existing.created_at);
              if (ts && (Date.now() - ts.getTime()) < 1000 * 60 * 60 * 48) {
                existingId = existing.id;
              }
            }
          } catch (error) {
            if (logger) logger.warn({ err: error }, 'supabase duplicate check error');
          }
        }
      }

      // Fall back to Firebase if Supabase not available
      if (!existingId && db) {
        const snap = await db.collection('events').where('dedupeKey', '==', dedupeKey).limit(1).get().catch(() => null);
        if (snap && !snap.empty) {
          const doc = snap.docs[0];
          const createdAt = doc.get('submittedAt');
          const ts = createdAt && createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
          if (ts && (Date.now() - ts.getTime()) < 1000 * 60 * 60 * 48) {
            existingId = doc.id;
          }
        }
      }

      const sc = getSanityClient ? getSanityClient() : null;
      let msgDoc = null;
      if (sc) {
        try {
          msgDoc = await sc.create({
            _type: 'message',
            direction: 'inbound',
            status: 'open',
            subject: summary || 'Event Request',
            bodyText: details,
            fromEmail: email,
            fromName: name,
            phone: phone || null,
            channel: 'form',
            inbox: 'events',
            messageType: 'event-request',
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          if (logger) logger.warn({ err: error }, 'failed to write event-request message to sanity');
        }
      }

      let eventId = existingId;

      // Store in Supabase (preferred)
      if (getSupabase && !existingId) {
        const supabase = getSupabase();
        if (supabase) {
          try {
            const eventData = {
              first_name: firstName,
              last_name: lastName,
              email,
              phone,
              event_date: startDate || null,
              city: city || null,
              state: state || null,
              zip: zip || null,
              event_type: eventType || null,
              guest_count: guestCount ? Number(guestCount) : null,
              notes: notes || null,
              send_copy: sendCopy,
              dedupe_key: dedupeKey,
              sanity_message_id: msgDoc?._id || null,
              status: 'pending',
            };
            const { data, error } = await supabase
              .from('event_requests')
              .insert([eventData])
              .select('id');

            if (error) {
              if (logger) logger.warn({ err: error }, 'failed to store event request in supabase');
            } else if (data && data.length > 0) {
              eventId = data[0].id;
            }
          } catch (error) {
            if (logger) logger.warn({ err: error }, 'supabase event request insert error');
          }
        }
      }

      // Fall back to Firebase if Supabase not available or if already exists
      if (db && !existingId && !eventId) {
        const payload = {
          title: summary || 'Event Request',
          date: startDate || new Date(),
          status: 'pending',
          notes: details,
          contact: { name, email, phone },
          location: location || null,
          eventType: eventType || null,
          guestCount: guestCount ? Number(guestCount) : null,
          source: 'website',
          submittedAt: new Date(),
          dedupeKey,
        };
        const ref = await db.collection('events').add(payload);
        eventId = ref.id;
      }

      const headers = getHeaders();
      if (headers) {
        const teamEmail = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
        const senderEmail = process.env.SENDER_EMAIL || teamEmail;
        const html = `
          <p>New <strong>Event Request</strong> from <strong>${name}</strong></p>
          <p><strong>Email:</strong> ${email}${phone ? ` · <strong>Phone:</strong> ${phone}` : ''}</p>
          <p><strong>Summary:</strong> ${summary || '(n/a)'}${location ? ` · <strong>Location:</strong> ${location}` : ''}</p>
          <hr />
          <pre style="white-space:pre-wrap;font-family:inherit">${(details || '').replace(/</g, '&lt;')}</pre>
          ${eventId ? `<p>Event ID: ${eventId}</p>` : ''}
        `;
        const attachments = [];
        if (startDate) {
          const ics = buildICS({
            uid: `evt-${eventId || Date.now()}@localeffortfood.com`,
            summary: summary || 'Event Request',
            description: `${name} — ${email}${phone ? `, ${phone}` : ''}\n\n${details}`,
            location,
            startDate,
            allDay: true,
          });
          attachments.push({ name: 'event-request.ics', content: Buffer.from(ics).toString('base64') });
        }
        const payload = {
          to: [{ email: teamEmail }],
          sender: { email: senderEmail, name: 'Local Effort' },
          subject: summary || 'New Event Request',
          htmlContent: html,
          replyTo: { email, name },
          tags: ['event-request'],
          attachment: attachments,
        };
        if (sendCopy && email) {
          payload.cc = [{ email, name }];
        }
        try {
          await sendEmail(payload);
        } catch (err) {
          if (logger) logger.warn({ err }, 'failed to send event request email');
        }
      }

      return res.json({ ok: true, eventId, sanityMessageId: msgDoc?._id || null });
    } catch (err) {
      if (logger) logger.error({ err }, 'events request error');
      return res.status(500).json({ error: 'event-request-failed' });
    }
  });

  router.post('/messages/send', requireTeamUser, async (req, res) => {
    try {
      const { to, subject, html, text, threadId, fromName, fromEmail } = req.body || {};
      if (!to || !Array.isArray(to) || to.length === 0) return res.status(400).json({ error: 'Missing recipients' });

      const senderEmail = fromEmail || process.env.SENDER_EMAIL;
      if (!senderEmail) return res.status(500).json({ error: 'Missing SENDER_EMAIL' });

      const payload = {
        to: to.map((email) => ({ email })),
        sender: { email: senderEmail, name: fromName || 'Local Effort' },
        subject: subject || '(no subject)',
        htmlContent: html || undefined,
        textContent: text || undefined,
        tags: ['outbound'],
        headers: threadId ? { 'X-Thread-Id': String(threadId) } : undefined,
      };

      try {
        await sendEmail(payload);
      } catch (err) {
        return handleEmailError(res, err, 'send-failed');
      }

      const sc = getSanityClient ? getSanityClient() : null;
      let msgDoc = null;
      if (sc) {
        try {
          msgDoc = await sc.create({
            _type: 'message',
            direction: 'outbound',
            status: 'sent',
            subject: subject || '(no subject)',
            bodyHtml: html || null,
            bodyText: text || null,
            toEmails: to,
            channel: 'email',
            inbox: 'general',
            threadId: threadId || null,
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          if (logger) logger.warn({ err: error }, 'failed to mirror outbound message');
        }
      }

      return res.json({ ok: true, id: msgDoc?._id || null });
    } catch (err) {
      if (logger) logger.error({ err }, 'messages send error');
      return res.status(500).json({ error: 'send-failed' });
    }
  });

  router.get('/inbox', requireTeamUser, async (req, res) => {
    try {
      const sc = getSanityClient ? getSanityClient() : null;
      if (!sc) return res.status(500).json({ error: 'Sanity not configured' });
      const { status = 'open', limit = '50' } = req.query || {};
      const lim = Math.min(200, parseInt(limit, 10) || 50);
      const query = `*[_type == "message" && status == $status] | order(createdAt desc)[0...$lim]{
        _id, direction, subject, fromEmail, fromName, toEmails, createdAt, inbox, status
      }`;
      const docs = await sc.fetch(query, { status, lim });
      return res.json({ items: docs });
    } catch (err) {
      if (logger) logger.error({ err }, 'inbox error');
      return res.status(500).json({ error: 'inbox-failed' });
    }
  });

  return router;
}

module.exports = { createMessagesRouter };
