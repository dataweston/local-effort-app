const express = require('express');

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

function createMessagesRouter({ logger, brevoService, getSanityClient, db, getSupabase }) {
  const router = express.Router();
  const { upsertContact, sendEmail, getHeaders } = brevoService;
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
      const { name, email, phone, subject, message, type = 'general', sendCopy = false } = req.body || {};
      if (!message) return res.status(400).json({ error: 'Message is required' });

      // Only upsert contact if email is provided
      if (email) {
        const [firstName, ...rest] = (name || '').split(' ');
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
            fromEmail: email,
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
              family_size: req.body.familySize || null,
              children: req.body.children || null,
              days_per_week: req.body.daysPerWeek || null,
              meals_per_day: req.body.mealsPerDay || null,
              allergies: req.body.allergies || null,
              questions: req.body.questions || null,
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
      const htmlContent = `
        <p>New inquiry from <strong>${fromDisplay}</strong></p>
        ${email ? `<p><strong>Email:</strong> ${email}</p>` : '<p><strong>Email:</strong> Not provided (anonymous)</p>'}
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        <p><strong>Type:</strong> ${type}</p>
        <hr />
        <pre style="white-space:pre-wrap;font-family:inherit">${(message || '').replace(/</g, '&lt;')}</pre>
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

      return res.json({ ok: true, id: msgDoc?._id || null });
    } catch (err) {
      if (logger) logger.error({ err }, 'messages submit error');
      return res.status(500).json({ error: 'submit-failed' });
    }
  });

  router.post('/food-truck/inquire', async (req, res) => {
    try {
      const { name, email, phone, eventDate, cuisine, location, notes } = req.body || {};
      if (!name || !email || !phone || !eventDate || !location) {
        return res.status(400).json({ error: 'missing-required-fields' });
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
      const trimmedEmail = String(email || '').trim().toLowerCase();
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        return res.status(400).json({ error: 'Missing email' });
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
        const fromEnv = process.env.BREVO_NEWSLETTER_LIST_IDS || process.env.BREVO_LIST_IDS || '';
        return parseListIds(fromEnv);
      })();

      await upsertContact({
        email: trimmedEmail,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        phone,
        listIds: resolvedListIds,
      });

      const subscriberName = [resolvedFirstName, resolvedLastName].filter(Boolean).join(' ').trim() || 'Subscriber';
      const subject = 'New newsletter subscription';
      const htmlContent = `
        <p><strong>New newsletter subscriber</strong></p>
        <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
        <p><strong>Name:</strong> ${escapeHtml(subscriberName)}</p>
        ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
        <p><strong>Source:</strong> ${escapeHtml(source)}</p>
        <p><strong>Brevo list IDs:</strong> ${resolvedListIds.length ? escapeHtml(resolvedListIds.join(', ')) : 'None configured'}</p>
      `;

      await sendEmail({
        to: [{ email: adminEmail }],
        sender: { email: senderEmail, name: 'Local Effort' },
        replyTo: { email: trimmedEmail, name: subscriberName },
        subject,
        htmlContent,
        tags: ['newsletter', 'subscribe'],
      });

      return res.json({ ok: true });
    } catch (err) {
      if (logger) logger.error({ err }, 'subscribe error');
      return res.status(500).json({ error: 'subscribe-failed' });
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

      if (!email || !firstName || !lastName || !phone) {
        return res.status(400).json({ error: 'missing-required-fields' });
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

  router.post('/messages/send', async (req, res) => {
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

  router.get('/inbox', async (req, res) => {
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
