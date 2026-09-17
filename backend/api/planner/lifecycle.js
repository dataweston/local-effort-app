'use strict';

const { syncPlannerWorkBlocks } = require('./googleCalendarSync');
const { projectPlannerCommercialLedger } = require('./commercialLedger');
const { projectPlannerEvidence } = require('./evidenceReconciliation');

function failedIntegration(error) {
  return {
    ok: false,
    error: String(error?.message || error),
  };
}

async function runPlannerCardLifecycle({ prismaClient, plannerUid, cardIds, syncCalendar = true }) {
  const ids = [...new Set((cardIds || []).filter(Boolean).map(String))];
  if (!ids.length) return { ok: true, integrations: {} };

  const integrations = {};
  try {
    integrations.commercial = await projectPlannerCommercialLedger({
      prisma: prismaClient,
      plannerUid,
      cardIds: ids,
    });
  } catch (error) {
    integrations.commercial = failedIntegration(error);
  }
  try {
    integrations.evidence = await projectPlannerEvidence({
      prisma: prismaClient,
      plannerUid,
      cardIds: ids,
    });
  } catch (error) {
    integrations.evidence = failedIntegration(error);
  }
  if (syncCalendar) {
    try {
      integrations.calendar = await syncPlannerWorkBlocks({
        prismaClient,
        plannerUid,
        cardIds: ids,
      });
    } catch (error) {
      integrations.calendar = failedIntegration(error);
    }
  } else {
    integrations.calendar = { ok: true, skipped: true, reason: 'admin_only' };
  }

  return {
    ok: Object.values(integrations).every((integration) => integration.ok !== false),
    integrations,
  };
}

module.exports = {
  runPlannerCardLifecycle,
};
