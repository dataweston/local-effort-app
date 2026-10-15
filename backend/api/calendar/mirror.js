// Writing a confirmed booking out to the Google calendars the routing graph
// cables it to. Runs after payment is verified and the confirmation jobs are
// durable; a failure here never fails the payment. It leaves a CalendarMirror
// row in 'error' with the reason, and the next pass (venue sync cron, webhook
// replay, or the admin retry button) writes it again.

const { loadGraph, resourceLabel, resourceOfEstimate } = require('./graph');
const { mirrorTargets } = require('./engine');
const google = require('./google');

const bookingFor = (estimate) => {
  const resource = resourceOfEstimate(estimate);
  const label = resourceLabel(resource);
  const guests = estimate.guestCount ? `${estimate.guestCount} guests` : null;
  return {
    id: estimate.id,
    date: estimate.eventDate,
    summary: `${label} — ${estimate.contactName || 'Booked'}${guests ? ` (${guests})` : ''}`,
    description: [
      `Booked and deposit paid through localeffortfood.com.`,
      estimate.eventTime ? `Start: ${estimate.eventTime} Central` : null,
      guests,
      estimate.serviceStyle ? `Service: ${String(estimate.serviceStyle).replace(/_/g, ' ')}` : null,
      `Reference: ${String(estimate.id).slice(0, 8).toUpperCase()}`,
    ]
      .filter(Boolean)
      .join('\n'),
    location: resource === 'client' ? estimate.location || null : null,
  };
};

/**
 * Mirror one paid estimate into every Google calendar cabled to its resource.
 * Returns [{ nodeId, status, error? }]. Never throws for a Google failure.
 */
async function mirrorEstimate({ db, estimate, graph, request, logger }) {
  const resource = resourceOfEstimate(estimate);
  const effective = graph || (await loadGraph(db));
  const targets = mirrorTargets(resource, 'google', effective);
  const results = [];

  for (const node of targets) {
    const where = { estimateId_nodeId: { estimateId: estimate.id, nodeId: node.id } };
    const prior = await db.calendarMirror.findUnique({ where });
    if (prior?.status === 'done') {
      results.push({ nodeId: node.id, status: 'done' });
      continue;
    }
    const calendarId = node.config?.calendarId || null;
    const attempts = (prior?.attempts || 0) + 1;
    let status = 'done';
    let externalId = prior?.externalId || null;
    let lastError = null;

    if (!calendarId) {
      status = 'error';
      lastError = 'calendar-id-not-set';
    } else if (!google.isConfigured() && !request) {
      status = 'error';
      lastError = 'google-calendar-not-configured';
    } else {
      try {
        externalId = await google.upsertBookingEvent({ calendarId, booking: bookingFor(estimate), request });
      } catch (error) {
        status = 'error';
        lastError = String(error?.message || error).slice(0, 300);
        if (logger?.warn) logger.warn({ err: error, estimateId: estimate.id, nodeId: node.id }, 'calendar mirror failed');
      }
    }

    await db.calendarMirror.upsert({
      where,
      create: { estimateId: estimate.id, nodeId: node.id, externalId, status, attempts, lastError, lastAttemptAt: new Date() },
      update: { externalId, status, attempts, lastError, lastAttemptAt: new Date() },
    });
    results.push({ nodeId: node.id, status, ...(lastError ? { error: lastError } : {}) });
  }
  return results;
}

/** Retry every mirror that has not landed. Returns counts for the cron response. */
async function retryFailedMirrors({ db, request, logger, limit = 25 }) {
  const rows = await db.calendarMirror.findMany({
    where: { status: { not: 'done' } },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });
  const graph = await loadGraph(db);
  let done = 0;
  let failed = 0;
  for (const row of rows) {
    const estimate = await db.smallEventEstimate.findUnique({ where: { id: row.estimateId } });
    if (!estimate || estimate.status !== 'confirmed') continue;
    const results = await mirrorEstimate({ db, estimate, graph, request, logger });
    for (const result of results.filter((entry) => entry.nodeId === row.nodeId)) {
      if (result.status === 'done') done += 1;
      else failed += 1;
    }
  }
  return { attempted: rows.length, done, failed };
}

module.exports = { bookingFor, mirrorEstimate, retryFailedMirrors };
