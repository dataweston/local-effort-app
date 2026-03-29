const { decisionEventSchema } = require('./contracts');

function logDecisionEvent({ logger, event }) {
  const payload = decisionEventSchema.parse(event);
  if (logger?.info) {
    logger.info({ decisionEvent: true, ...payload }, 'decision event');
  }
  return payload;
}

module.exports = { logDecisionEvent };
