const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const {
  hypothesisSchema,
  priorityEvaluationSchema,
  priorityRegistryEntrySchema,
} = require('./contracts');

const registrySchema = z.array(priorityRegistryEntrySchema);

function resolveDefaultRegistryPath() {
  return path.resolve(__dirname, './businessPriorities.json');
}

function loadBusinessPriorityRegistry(registryPath = resolveDefaultRegistryPath(), { fsImpl = fs } = {}) {
  const raw = fsImpl.readFileSync(registryPath, 'utf8');
  return normalizeRegistryEntries(JSON.parse(raw), { sourceName: 'json' });
}

function normalizeRegistryEntries(entries, { sourceName } = {}) {
  return registrySchema.parse(
    (Array.isArray(entries) ? entries : []).map((entry) => ({
      ...entry,
      sourceName: entry?.sourceName || sourceName,
    }))
  );
}

function evaluateEntryMatch(context, entry) {
  const pathValue = String(context?.page?.path || '/');
  const pageType = String(context?.page?.type || '');
  const acquisitionSource = String(context?.acquisition?.source || '').toLowerCase();
  const campaignClass = String(context?.acquisition?.campaignClass || '').toLowerCase();
  const commercialMode = String(context?.visitor?.commercialMode || '').toLowerCase();
  const occurredAt = Date.parse(context?.occurredAt || '');
  const pageTypes = entry.match?.pageTypes || [];
  const pathPrefixes = entry.match?.pathPrefixes || [];
  const acquisitionSources = (entry.match?.acquisitionSources || []).map((value) => String(value).toLowerCase());
  const campaignClasses = (entry.match?.campaignClasses || []).map((value) => String(value).toLowerCase());
  const commercialModes = (entry.match?.commercialModes || []).map((value) => String(value).toLowerCase());
  const suppressionPathPrefixes = entry.suppression?.pathPrefixes || [];
  const suppressionAcquisitionSources = (entry.suppression?.acquisitionSources || []).map((value) => String(value).toLowerCase());
  const suppressionCommercialModes = (entry.suppression?.commercialModes || []).map((value) => String(value).toLowerCase());

  const pageTypeMatch = pageTypes.length === 0 || pageTypes.includes(pageType);
  const pathMatch = pathPrefixes.length === 0 || pathPrefixes.some((prefix) => {
    if (prefix === '/') return pathValue === '/';
    return pathValue.startsWith(prefix);
  });
  const acquisitionMatch = acquisitionSources.length === 0 || acquisitionSources.includes(acquisitionSource);
  const campaignClassMatch = campaignClasses.length === 0 || campaignClasses.includes(campaignClass);
  const commercialModeMatch = commercialModes.length === 0 || commercialModes.includes(commercialMode);
  const activeMatch = entry.active !== false;
  const startAt = entry.activeWindow?.startAt ? Date.parse(entry.activeWindow.startAt) : null;
  const endAt = entry.activeWindow?.endAt ? Date.parse(entry.activeWindow.endAt) : null;
  const activeWindowMatch = Number.isNaN(occurredAt)
    ? true
    : (!startAt || occurredAt >= startAt) && (!endAt || occurredAt <= endAt);
  const suppressedByPath = suppressionPathPrefixes.some((prefix) => pathValue.startsWith(prefix));
  const suppressedBySource = suppressionAcquisitionSources.includes(acquisitionSource);
  const suppressedByMode = suppressionCommercialModes.includes(commercialMode);
  const suppressionMatch = !(suppressedByPath || suppressedBySource || suppressedByMode);

  return priorityEvaluationSchema.parse({
    ...entry,
    matched:
      activeMatch
      && activeWindowMatch
      && pageTypeMatch
      && pathMatch
      && acquisitionMatch
      && campaignClassMatch
      && commercialModeMatch
      && suppressionMatch,
    matchDetails: {
      active: activeMatch,
      activeWindow: activeWindowMatch,
      pageType: pageTypeMatch,
      pathPrefix: pathMatch,
      acquisitionSource: acquisitionMatch,
      campaignClass: campaignClassMatch,
      commercialMode: commercialModeMatch,
      suppression: suppressionMatch,
    },
  });
}

function matchesEntry(context, entry) {
  return evaluateEntryMatch(context, entry).matched;
}

function evaluateBusinessPriorities(context, registry) {
  return registry
    .map((entry) => evaluateEntryMatch(context, entry))
    .sort((left, right) => right.weight - left.weight);
}

function scoreBusinessPriorities(context, registry) {
  return evaluateBusinessPriorities(context, registry)
    .filter((entry) => entry.matched)
    .sort((left, right) => right.weight - left.weight);
}

function inferVisitorHypotheses(context) {
  const hypotheses = [];
  if (context.session.cartItemCount > 0) {
    hypotheses.push({ label: 'high_intent_purchase', confidence: 0.82, source: 'cart_state' });
  }
  if (context.page.type === 'product') {
    hypotheses.push({ label: 'product_comparison', confidence: 0.68, source: 'page_type' });
  }
  if (context.page.type === 'service' || context.page.type === 'home') {
    hypotheses.push({ label: 'service_discovery', confidence: 0.64, source: 'page_type' });
  }
  if (context.visitor.isReturning) {
    hypotheses.push({ label: 'returning_customer', confidence: 0.74, source: 'visitor_state' });
  }
  return z.array(hypothesisSchema).parse(hypotheses);
}

module.exports = {
  evaluateBusinessPriorities,
  evaluateEntryMatch,
  inferVisitorHypotheses,
  loadBusinessPriorityRegistry,
  matchesEntry,
  normalizeRegistryEntries,
  registryEntrySchema: priorityRegistryEntrySchema,
  registrySchema,
  scoreBusinessPriorities,
};
