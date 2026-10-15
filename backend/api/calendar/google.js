// Google Calendar, via a service account.
//
// The owner shares each calendar with the service account's email address
// ("Make changes to events" for calendars we write to, "See all event details"
// for calendars we only read). No OAuth consent, nothing to reconnect, and the
// account can touch nothing that was not explicitly shared with it. The
// planner's OAuth sync (planner/googleCalendarSync.js) is for the calendar the
// owner's own login owns; it cannot reach someone else's calendar.
//
// Env:
//   GOOGLE_CALENDAR_SA_EMAIL   service account client_email
//   GOOGLE_CALENDAR_SA_KEY     its private_key (literal "\n" sequences accepted)
//
// Calendar ids are stored with the routing graph, not in env, so the owner can
// change which calendar a booking lands in without a deploy.

const { addDaysIso, eachDay } = require('./dates');

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3';
const TIME_ZONE = 'America/Chicago';

// Every event we write carries this private property; it is how a retry finds
// the event it already made, and how the reader ignores our own writes.
const BOOKING_PROP = 'localEffortBooking';

let cachedClient = null;

const isConfigured = (env = process.env) => Boolean(env.GOOGLE_CALENDAR_SA_EMAIL && env.GOOGLE_CALENDAR_SA_KEY);

async function defaultRequest(options) {
  if (!isConfigured()) throw new Error('google-calendar-not-configured');
  if (!cachedClient) {
    const { JWT } = require('google-auth-library');
    cachedClient = new JWT({
      email: process.env.GOOGLE_CALENDAR_SA_EMAIL,
      key: String(process.env.GOOGLE_CALENDAR_SA_KEY).replace(/\\n/g, '\n'),
      scopes: [SCOPE],
    });
  }
  const response = await cachedClient.request(options);
  return response.data;
}

const calendarUrl = (calendarId) => `${API}/calendars/${encodeURIComponent(calendarId)}/events`;

/** All-day event body for one booking. End date is exclusive, per Google. */
function bookingEventBody({ id, date, summary, description, location }) {
  return {
    summary,
    description,
    location: location || undefined,
    start: { date, timeZone: TIME_ZONE },
    end: { date: addDaysIso(date, 1), timeZone: TIME_ZONE },
    transparency: 'opaque',
    extendedProperties: { private: { [BOOKING_PROP]: id } },
  };
}

/**
 * Create or update the event for a booking. Idempotent: a retry after a
 * timeout finds the event the first attempt made instead of adding a second.
 * Returns the Google event id.
 */
async function upsertBookingEvent({ calendarId, booking, request = defaultRequest }) {
  const body = bookingEventBody(booking);
  const found = await request({
    url: calendarUrl(calendarId),
    method: 'GET',
    params: { privateExtendedProperty: `${BOOKING_PROP}=${booking.id}`, maxResults: 1, showDeleted: false },
  });
  const existing = found?.items?.[0];
  if (existing?.id) {
    const updated = await request({
      url: `${calendarUrl(calendarId)}/${encodeURIComponent(existing.id)}`,
      method: 'PATCH',
      params: { sendUpdates: 'none' },
      data: body,
    });
    if (!updated?.id) throw new Error('google-event-not-confirmed');
    return updated.id;
  }
  const created = await request({
    url: calendarUrl(calendarId),
    method: 'POST',
    params: { sendUpdates: 'none' },
    data: body,
  });
  if (!created?.id) throw new Error('google-event-not-confirmed');
  return created.id;
}

/** Remove a booking's event (cancelled or refunded). A missing event is success. */
async function deleteBookingEvent({ calendarId, eventId, request = defaultRequest }) {
  try {
    await request({
      url: `${calendarUrl(calendarId)}/${encodeURIComponent(eventId)}`,
      method: 'DELETE',
      params: { sendUpdates: 'none' },
    });
  } catch (error) {
    const status = error?.response?.status || error?.status || error?.code;
    if (status !== 404 && status !== 410) throw error;
  }
}

/**
 * Busy days on a calendar someone else keeps (Steve Ray's bookings at the
 * Local Kitchen). Events we wrote ourselves are skipped, so a booking we
 * mirrored out never comes back in as a second block. Transparent ("free")
 * and cancelled events do not block.
 *
 * Returns [{ uid, start, end (inclusive), summary }], the same shape as the
 * iCal parser, so the feed sync treats a Google calendar like any other feed.
 */
async function readBusyEvents({ calendarId, from, to, request = defaultRequest }) {
  const events = [];
  let pageToken;
  do {
    const page = await request({
      url: calendarUrl(calendarId),
      method: 'GET',
      params: {
        timeMin: `${from}T00:00:00Z`,
        timeMax: `${addDaysIso(to, 1)}T00:00:00Z`,
        singleEvents: true,
        showDeleted: false,
        maxResults: 250,
        pageToken,
      },
    });
    for (const item of page?.items || []) {
      if (item.status === 'cancelled' || item.transparency === 'transparent') continue;
      if (item.extendedProperties?.private?.[BOOKING_PROP]) continue;
      const startDay = item.start?.date || String(item.start?.dateTime || '').slice(0, 10);
      const rawEnd = item.end?.date || String(item.end?.dateTime || '').slice(0, 10);
      if (!startDay) continue;
      // Timed events carry an offset; their wall-clock day is the first ten
      // characters of the RFC 3339 string as written in the calendar's own zone.
      const exclusiveEnd = item.end?.date ? rawEnd : addDaysIso(rawEnd || startDay, 1);
      let end = addDaysIso(exclusiveEnd, -1);
      if (end < startDay) end = startDay;
      events.push({ uid: item.id, start: startDay, end, summary: item.summary || 'Busy', days: eachDay(startDay, end) });
    }
    pageToken = page?.nextPageToken;
  } while (pageToken);
  return events;
}

module.exports = {
  BOOKING_PROP,
  bookingEventBody,
  deleteBookingEvent,
  isConfigured,
  readBusyEvents,
  upsertBookingEvent,
};
