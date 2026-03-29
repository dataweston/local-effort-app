function summarizeEvents(events = []) {
  const totals = {
    totalEvents: events.length,
    rendered: 0,
    clicked: 0,
    dismissed: 0,
    converted: 0,
  };
  const variants = new Map();
  const strategies = new Map();
  const priorities = new Map();

  for (const event of events) {
    if (event.eventType === 'decision.rendered') totals.rendered += 1;
    if (event.eventType === 'decision.clicked') totals.clicked += 1;
    if (event.eventType === 'decision.dismissed') totals.dismissed += 1;
    if (event.eventType === 'decision.converted') totals.converted += 1;

    const variantKey = event.variant || 'unassigned';
    variants.set(variantKey, (variants.get(variantKey) || 0) + 1);

    const strategyKey = event.strategy || 'unknown';
    strategies.set(strategyKey, (strategies.get(strategyKey) || 0) + 1);

    for (const priorityId of event.selectedPriorityIds || []) {
      priorities.set(priorityId, (priorities.get(priorityId) || 0) + 1);
    }
  }

  return {
    totals,
    variants: Array.from(variants.entries()).map(([key, count]) => ({ key, count })),
    strategies: Array.from(strategies.entries()).map(([key, count]) => ({ key, count })),
    topPriorities: Array.from(priorities.entries())
      .map(([priorityId, count]) => ({ priorityId, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10),
    clickThroughRate: totals.rendered > 0 ? Number((totals.clicked / totals.rendered).toFixed(4)) : 0,
  };
}

function createDecisionReportingService({ prismaClient, logger } = {}) {
  async function getSummary({ days = 7 } = {}) {
    if (!prismaClient?.decisionEvent?.findMany) {
      logger?.warn?.('decision reporting unavailable');
      return {
        ok: false,
        reason: 'reporting-unavailable',
        totals: {
          totalEvents: 0,
          rendered: 0,
          clicked: 0,
          dismissed: 0,
          converted: 0,
        },
        variants: [],
        strategies: [],
        topPriorities: [],
        clickThroughRate: 0,
      };
    }

    const windowStart = new Date(Date.now() - Math.max(1, Number(days || 7)) * 24 * 60 * 60 * 1000);
    try {
      const events = await prismaClient.decisionEvent.findMany({
        where: {
          occurredAt: {
            gte: windowStart,
          },
        },
        orderBy: {
          occurredAt: 'desc',
        },
        take: 500,
      });

      return {
        ok: true,
        days: Math.max(1, Number(days || 7)),
        ...summarizeEvents(events),
      };
    } catch (err) {
      logger?.warn?.({ err }, 'decision reporting query failed');
      return {
        ok: false,
        reason: 'reporting-query-failed',
        totals: {
          totalEvents: 0,
          rendered: 0,
          clicked: 0,
          dismissed: 0,
          converted: 0,
        },
        variants: [],
        strategies: [],
        topPriorities: [],
        clickThroughRate: 0,
      };
    }
  }

  return {
    getSummary,
  };
}

module.exports = {
  createDecisionReportingService,
  summarizeEvents,
};
