const { decisionResultSchema } = require('./contracts');
const {
  evaluateBusinessPriorities,
  inferVisitorHypotheses,
  loadBusinessPriorityRegistry,
  scoreBusinessPriorities,
} = require('./businessPriorityRegistry');
const { DEFAULT_DECISION_EXPERIMENT_KEY } = require('./experiments');

function buildReasonCodes({ priorities, hypotheses, strategy, context }) {
  const reasonCodes = new Set([strategy]);
  for (const priority of priorities) {
    for (const reason of priority.reasons || []) {
      reasonCodes.add(reason);
    }
  }
  for (const hypothesis of hypotheses) {
    reasonCodes.add(hypothesis.label);
  }
  if (context.page.type) reasonCodes.add(`page:${context.page.type}`);
  return Array.from(reasonCodes);
}

function chooseStrategy(context, priorities, hypotheses) {
  if (priorities[0]?.strategy) return priorities[0].strategy;
  if (context.session.cartItemCount > 0) return 'reassure';
  if (hypotheses.some((entry) => entry.label === 'high_intent_purchase')) return 'reassure';
  if (context.page.type === 'sale') return 'promote';
  if (context.page.type === 'home' || context.page.type === 'article') return 'orient';
  return 'promote';
}

function composeWelcomeText({ strategy, priorities, context, hypotheses }) {
  const topPriority = priorities[0];
  const topFact = topPriority?.messageFacts?.[0];
  const path = context.page.path;

  if (strategy === 'orient') {
    return topFact
      ? `Welcome. ${topFact}`
      : `Welcome. The best place to begin from ${path} is the fastest path into the right service or product.`;
  }
  if (strategy === 'reassure') {
    if (topFact) return `You are in the right place. ${topFact}`;
    if (hypotheses.some((entry) => entry.label === 'returning_customer')) {
      return 'Welcome back. The fastest path is to continue where you already have clear buying intent.';
    }
    return 'You are in the right place. Start with the clearest product or ordering path, then confirm details quickly.';
  }
  return topFact
    ? `Start here. ${topFact}`
    : 'Start here. This path is optimized to get visitors to the highest-fit offer quickly.';
}

function buildControlCandidate({ context }) {
  return {
    strategy: 'orient',
    visitorHypotheses: [],
    businessPriorities: [],
    welcomeText: `Welcome. Explore the offerings on ${context.page.path} and choose the path that fits your needs.`,
    suggestedActions: [],
    reasonCodes: ['control', `page:${context.page.type || 'page'}`],
  };
}

async function buildDecisionPreview({
  context,
  assignment = {
    experimentKey: DEFAULT_DECISION_EXPERIMENT_KEY,
    variant: 'rules',
    bucket: 0,
    source: 'default',
  },
  prioritySource,
  registry = loadBusinessPriorityRegistry(),
  llmCopyService,
} = {}) {
  const priorityEvaluations = evaluateBusinessPriorities(context, registry);

  if (assignment.variant === 'control') {
    return decisionResultSchema.parse({
      version: '1',
      context,
      assignment,
      selected: buildControlCandidate({ context }),
      alternatives: [],
      debug: {
        prioritySource,
        priorityEvaluations,
      },
    });
  }

  const priorities = scoreBusinessPriorities(context, registry).slice(0, 3);
  const hypotheses = inferVisitorHypotheses(context);
  const strategy = chooseStrategy(context, priorities, hypotheses);
  const reasonCodes = buildReasonCodes({ priorities, hypotheses, strategy, context });
  const selected = {
    strategy,
    visitorHypotheses: hypotheses,
    businessPriorities: priorities.map((priority) => ({
      id: priority.id,
      label: priority.label,
      weight: priority.weight,
      active: priority.active,
      reasons: priority.reasons,
      messageFacts: priority.messageFacts,
      cta: priority.cta,
    })),
    welcomeText: composeWelcomeText({ strategy, priorities, context, hypotheses }),
    suggestedActions: priorities
      .map((priority) => priority.cta)
      .filter(Boolean)
      .slice(0, 3),
    reasonCodes,
  };

  if (assignment.variant === 'llm-copy' && llmCopyService?.generateCopy) {
    const llmResult = await llmCopyService.generateCopy({ context, selected });
    if (llmResult?.ok && llmResult.welcomeText) {
      selected.welcomeText = llmResult.welcomeText;
      selected.reasonCodes = Array.from(new Set([
        ...selected.reasonCodes,
        'llm-copy',
        ...(llmResult.reasonCodes || []),
      ]));
    } else {
      selected.reasonCodes = Array.from(new Set([
        ...selected.reasonCodes,
        'llm-fallback',
      ]));
    }
  }

  return decisionResultSchema.parse({
    version: '1',
    context,
    assignment,
    selected,
    alternatives: [],
    debug: {
      prioritySource,
      priorityEvaluations,
    },
  });
}

module.exports = {
  buildDecisionPreview,
  buildReasonCodes,
  chooseStrategy,
  composeWelcomeText,
};
