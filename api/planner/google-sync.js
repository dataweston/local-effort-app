// Google Calendar sync API route
// Pushes planner cards for a given week to Google Calendar
// Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET env vars + stored tokens

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch {
  prisma = null;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyToken(authorization) {
  if (!supabaseUrl || !serviceKey) return null;
  const token = (authorization || '').replace('Bearer ', '');
  if (!token) return null;
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!prisma) {
    return res.status(500).json({ error: 'Database not available' });
  }

  const { weekStart } = req.body || {};
  if (!weekStart) {
    return res.status(400).json({ error: 'weekStart is required' });
  }

  try {
    // Check for stored Google tokens
    const tokenRecord = await prisma.googleCalendarToken.findUnique({
      where: { supabaseUid: user.id },
    }).catch(() => null);

    if (!tokenRecord) {
      return res.status(400).json({
        error: 'Google Calendar not connected. Please set up Google API credentials and complete the OAuth flow.',
        code: 'NO_GOOGLE_TOKEN',
      });
    }

    // Fetch cards for the week
    const weekEnd = (() => {
      const d = new Date(weekStart + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 6);
      return d.toISOString().split('T')[0];
    })();

    const cards = await prisma.plannerCard.findMany({
      where: {
        supabaseUid: user.id,
        date: { gte: weekStart, lte: weekEnd },
      },
      orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }],
    });

    // Refresh access token if needed
    let accessToken = tokenRecord.accessToken;
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.status(500).json({
          error: 'Google API credentials not configured',
          code: 'NO_GOOGLE_CREDENTIALS',
        });
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokenRecord.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenRes.ok) {
        return res.status(500).json({ error: 'Failed to refresh Google token' });
      }

      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;

      await prisma.googleCalendarToken.update({
        where: { supabaseUid: user.id },
        data: {
          accessToken,
          expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        },
      });
    }

    const calendarId = tokenRecord.calendarId || 'primary';
    let synced = 0;

    // Create/update events for each card
    for (const card of cards) {
      if (card.optional && !card.enabled) continue;

      const startDateTime = card.startTime
        ? `${card.date}T${card.startTime}:00`
        : `${card.date}T09:00:00`;
      const endDateTime = card.endTime
        ? `${card.date}T${card.endTime}:00`
        : `${card.date}T10:00:00`;

      const event = {
        summary: card.title,
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Chicago',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Chicago',
        },
        description: [
          card.people.length > 0 ? `People: ${card.people.join(', ')}` : '',
          card.revenue > 0 ? `Revenue: $${card.revenue}` : '',
          card.cost > 0 ? `Labor: $${card.cost}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      };

      const gcalRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (gcalRes.ok) {
        synced++;
      }
    }

    return res.json({ ok: true, synced, total: cards.length });
  } catch (err) {
    console.error('Google sync error:', err);
    return res.status(500).json({ error: 'Sync failed' });
  }
};
