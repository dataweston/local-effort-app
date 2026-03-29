const DEFAULT_DECISION_EXPERIMENT_KEY = 'adaptive-welcome-v1';

const decisionExperiments = {
  [DEFAULT_DECISION_EXPERIMENT_KEY]: {
    key: DEFAULT_DECISION_EXPERIMENT_KEY,
    description: 'Baseline experiment for adaptive welcome decisioning.',
    variants: [
      { key: 'control', weight: 0.4 },
      { key: 'rules', weight: 0.6 },
      { key: 'llm-copy', weight: 0.0 },
    ],
  },
};

function getDecisionExperiment(experimentKey = DEFAULT_DECISION_EXPERIMENT_KEY) {
  return decisionExperiments[experimentKey] || decisionExperiments[DEFAULT_DECISION_EXPERIMENT_KEY];
}

module.exports = {
  DEFAULT_DECISION_EXPERIMENT_KEY,
  decisionExperiments,
  getDecisionExperiment,
};
