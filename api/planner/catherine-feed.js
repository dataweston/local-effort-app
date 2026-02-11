const { PrismaClient } = require('@prisma/client');
const { verifyPlannerFeedToken } = require('./_feedToken');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

function normalizePeople(people) {
  if (Array.isArray(people)) {
    return people.map((p) => String(p).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof people === 'string') {
    return people
      .split(/[,;|]/)
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function isCatherineRelevant(card) {
  const people = normalizePeople(card?.people);
  if (people.some((p) => p === 'catherine' || p.includes('catherine'))) return true;
  if (people.some((p) => p === 'teddy' || p.includes('teddy'))) return true;
  const title = String(card?.title || '').toLowerCase();
  if (title.includes('catherine')) return true;
  if (title.includes('teddy')) return true;
  if (title.includes('babysitter')) return true;
  if (title.includes('teddy with weston') || title.includes('with weston')) return true;
  return false;
}

function normalizeDateKey(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

function parseTimeParts(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  const ampm = value.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([AaPp][Mm])$/);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = Number(ampm[2] || '0');
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
    const isPM = ampm[3].toLowerCase() === 'pm';
    if (hour === 12) hour = isPM ? 12 : 0;
    else if (isPM) hour += 12;
    return { hour, minute };
  }

  const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function dateKeyToIcsDate(dateKey) {
  return String(dateKey).replace(/-/g, '');
}

function dateAndPartsToIcs(dateKey, parts) {
  if (!parts) return null;
  const datePart = dateKeyToIcsDate(dateKey);
  const hh = String(parts.hour).padStart(2, '0');
  const mm = String(parts.minute).padStart(2, '0');
  return `${datePart}T${hh}${mm}00`;
}

function formatDtStamp(date = new Date()) {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function foldIcsLine(line) {
  const max = 74;
  if (line.length <= max) return [line];
  const chunks = [];
  for (let i = 0; i < line.length; i += max) {
    const part = line.slice(i, i + max);
    chunks.push(i === 0 ? part : ` ${part}`);
  }
  return chunks;
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toEventLines(card, uid, dtStamp) {
  const dateKey = normalizeDateKey(card.date);
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return [];

  const summary = escapeIcsText(card.title || 'Schedule item');
  const people = normalizePeople(card.people);
  const descriptionParts = [];
  if (people.length > 0) descriptionParts.push(`People: ${people.join(', ')}`);
  if (card.zone) descriptionParts.push(`Zone: ${card.zone}`);
  if (card.startTime || card.endTime) {
    descriptionParts.push(`Time: ${card.startTime || 'TBD'}-${card.endTime || 'TBD'}`);
  }
  const description = escapeIcsText(descriptionParts.join('\n'));

  const baseUid = escapeIcsText(`planner-${uid}-${card.id || `${dateKey}-${summary}`}@localeffortfood.com`);

  const startParts = parseTimeParts(card.startTime);
  let endParts = parseTimeParts(card.endTime);
  const startDateTime = dateAndPartsToIcs(dateKey, startParts);
  let endDateForTime = dateKey;
  let endDateTime = dateAndPartsToIcs(endDateForTime, endParts);

  if (startParts && endParts) {
    const startMinutes = startParts.hour * 60 + startParts.minute;
    const endMinutes = endParts.hour * 60 + endParts.minute;
    if (endMinutes <= startMinutes) {
      endDateForTime = addDays(dateKey, 1);
      endDateTime = dateAndPartsToIcs(endDateForTime, endParts);
    }
  }

  if (startDateTime && !endDateTime) {
    if (startParts) {
      const computed = startParts.hour * 60 + startParts.minute + 60;
      const endHour = Math.floor(computed / 60) % 24;
      const endMinute = computed % 60;
      if (computed >= 24 * 60) {
        endDateForTime = addDays(dateKey, 1);
      }
      endParts = { hour: endHour, minute: endMinute };
      endDateTime = dateAndPartsToIcs(endDateForTime, endParts);
    }
  }

  const lines = ['BEGIN:VEVENT'];
  lines.push(`UID:${baseUid}`);
  lines.push(`DTSTAMP:${dtStamp}`);
  lines.push(`SUMMARY:${summary}`);
  if (description) lines.push(`DESCRIPTION:${description}`);

  if (startDateTime && endDateTime) {
    lines.push(`DTSTART;TZID=America/Chicago:${startDateTime}`);
    lines.push(`DTEND;TZID=America/Chicago:${endDateTime}`);
  } else {
    const startDate = dateKeyToIcsDate(dateKey);
    const endDate = dateKeyToIcsDate(addDays(dateKey, 1));
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${endDate}`);
  }

  lines.push('END:VEVENT');
  return lines;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  if (!prisma) {
    return res.status(500).send('Database not configured');
  }

  const token = req.query?.token;
  const verified = verifyPlannerFeedToken(token);
  if (!verified?.uid) {
    return res.status(401).send('Unauthorized');
  }

  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 30);
  const to = new Date(today);
  to.setUTCDate(to.getUTCDate() + 370);
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);

  try {
    const cards = await prisma.plannerCard.findMany({
      where: {
        supabaseUid: verified.uid,
        date: { gte: fromKey, lte: toKey },
      },
      orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }],
    });

    const visible = cards.filter((card) => {
      if (!isCatherineRelevant(card)) return false;
      if (card.enabled === false) return false;
      return true;
    });

    const dtStamp = formatDtStamp(new Date());
    const eventLines = [];
    for (const card of visible) {
      const lines = toEventLines(card, verified.uid, dtStamp);
      for (const line of lines) {
        for (const folded of foldIcsLine(line)) {
          eventLines.push(folded);
        }
      }
    }

    const calendarLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Local Effort//Catherine Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Catherine Schedule',
      'X-WR-TIMEZONE:America/Chicago',
      ...eventLines,
      'END:VCALENDAR',
    ];

    const body = `${calendarLines.join('\r\n')}\r\n`;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="catherine-schedule.ics"');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).send(body);
  } catch (err) {
    console.error('GET /api/planner/catherine-feed error:', err);
    return res.status(500).send('Failed to generate calendar feed');
  }
};
