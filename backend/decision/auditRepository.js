const { prisma } = require('../api/utils/prisma');

function createDecisionAuditRepository({
  prismaClient = prisma,
  logger,
} = {}) {
  const hasAssignments = !!prismaClient?.decisionAssignment?.upsert;
  const hasEvents = !!prismaClient?.decisionEvent?.create;
  let warnedAssignments = false;
  let warnedEvents = false;

  function warnOnce(kind) {
    if (kind === 'assignments' && !warnedAssignments) {
      warnedAssignments = true;
      logger?.warn?.('decision assignment persistence unavailable');
    }
    if (kind === 'events' && !warnedEvents) {
      warnedEvents = true;
      logger?.warn?.('decision event persistence unavailable');
    }
  }

  async function persistAssignment({ assignment, context }) {
    if (!hasAssignments) {
      warnOnce('assignments');
      return null;
    }
    try {
      return await prismaClient.decisionAssignment.upsert({
        where: {
          experimentKey_sessionId: {
            experimentKey: assignment.experimentKey,
            sessionId: context.sessionId,
          },
        },
        update: {
          variant: assignment.variant,
          bucket: assignment.bucket,
          path: context.page.path,
          pageType: context.page.type || null,
        },
        create: {
          experimentKey: assignment.experimentKey,
          sessionId: context.sessionId,
          variant: assignment.variant,
          bucket: assignment.bucket,
          path: context.page.path,
          pageType: context.page.type || null,
        },
      });
    } catch (err) {
      logger?.warn?.({ err }, 'decision assignment persistence failed');
      warnOnce('assignments');
      return null;
    }
  }

  async function persistEvent(event) {
    if (!hasEvents) {
      warnOnce('events');
      return null;
    }
    try {
      return await prismaClient.decisionEvent.create({
        data: {
          schemaVersion: event.version,
          sessionId: event.sessionId,
          eventType: event.eventType,
          occurredAt: new Date(event.occurredAt),
          path: event.path,
          strategy: event.strategy,
          experimentKey: event.assignment?.experimentKey || null,
          variant: event.assignment?.variant || null,
          bucket: Number.isInteger(event.assignment?.bucket) ? event.assignment.bucket : null,
          reasonCodes: event.reasonCodes || [],
          selectedPriorityIds: event.selectedPriorityIds || [],
          metadata: event.metadata || {},
        },
      });
    } catch (err) {
      logger?.warn?.({ err }, 'decision event persistence failed');
      warnOnce('events');
      return null;
    }
  }

  return {
    persistAssignment,
    persistEvent,
  };
}

module.exports = { createDecisionAuditRepository };
