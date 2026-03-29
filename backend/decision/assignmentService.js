const crypto = require('crypto');
const { decisionAssignmentSchema } = require('./contracts');
const { DEFAULT_DECISION_EXPERIMENT_KEY, getDecisionExperiment } = require('./experiments');

function hashToBucket(input) {
  const hash = crypto.createHash('sha256').update(String(input)).digest('hex');
  const value = parseInt(hash.slice(0, 8), 16);
  return value % 10000;
}

function resolveVariant(bucket, variants) {
  const normalizedBucket = bucket / 10000;
  let running = 0;
  for (const variant of variants) {
    running += variant.weight;
    if (normalizedBucket < running) {
      return variant.key;
    }
  }
  return variants[variants.length - 1].key;
}

function createDecisionAssignmentService({
  getExperiment = getDecisionExperiment,
} = {}) {
  function assign({ sessionId, experimentKey = DEFAULT_DECISION_EXPERIMENT_KEY }) {
    const experiment = getExperiment(experimentKey);
    const bucket = hashToBucket(`${experiment.key}:${sessionId}`);
    const variant = resolveVariant(bucket, experiment.variants);
    return decisionAssignmentSchema.parse({
      experimentKey: experiment.key,
      variant,
      bucket,
      source: 'deterministic_hash',
    });
  }

  return {
    assign,
  };
}

module.exports = {
  createDecisionAssignmentService,
  hashToBucket,
  resolveVariant,
};
