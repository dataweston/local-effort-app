const { getSanityClient, getSanityReadClient } = require('../api/sanityClient');
const {
  normalizeRegistryEntries,
  registrySchema,
} = require('./businessPriorityRegistry');

const SANITY_PRIORITY_QUERY = `*[_type == "decisionPriority"] | order(weight desc, _updatedAt desc) {
  _id,
  priorityId,
  title,
  active,
  weight,
  strategy,
  reasons,
  messageFacts,
  ctaLabel,
  ctaHref,
  match {
    pageTypes,
    pathPrefixes,
    acquisitionSources,
    campaignClasses,
    commercialModes
  },
  activeWindow,
  audienceTags,
  suppression,
  _updatedAt
}`;

function mapSanityPriority(doc = {}) {
  return {
    id: doc.priorityId || doc._id,
    label: doc.title || doc.priorityId || doc._id,
    weight: doc.weight,
    active: doc.active,
    strategy: doc.strategy,
    reasons: Array.isArray(doc.reasons) ? doc.reasons : [],
    messageFacts: Array.isArray(doc.messageFacts) ? doc.messageFacts : [],
    cta: doc.ctaLabel && doc.ctaHref
      ? {
          label: doc.ctaLabel,
          href: doc.ctaHref,
        }
      : undefined,
    match: {
      pageTypes: Array.isArray(doc.match?.pageTypes) ? doc.match.pageTypes : [],
      pathPrefixes: Array.isArray(doc.match?.pathPrefixes) ? doc.match.pathPrefixes : [],
      acquisitionSources: Array.isArray(doc.match?.acquisitionSources) ? doc.match.acquisitionSources : [],
      campaignClasses: Array.isArray(doc.match?.campaignClasses) ? doc.match.campaignClasses : [],
      commercialModes: Array.isArray(doc.match?.commercialModes) ? doc.match.commercialModes : [],
    },
    activeWindow: doc.activeWindow
      ? {
          startAt: doc.activeWindow.startAt || undefined,
          endAt: doc.activeWindow.endAt || undefined,
        }
      : undefined,
    audienceTags: Array.isArray(doc.audienceTags) ? doc.audienceTags : [],
    suppression: doc.suppression
      ? {
          pathPrefixes: Array.isArray(doc.suppression.pathPrefixes) ? doc.suppression.pathPrefixes : [],
          acquisitionSources: Array.isArray(doc.suppression.acquisitionSources) ? doc.suppression.acquisitionSources : [],
          commercialModes: Array.isArray(doc.suppression.commercialModes) ? doc.suppression.commercialModes : [],
        }
      : undefined,
    sourceDocumentId: doc._id,
    sourceUpdatedAt: doc._updatedAt,
  };
}

function createJsonPriorityRepository({ loadRegistry, logger } = {}) {
  return {
    name: 'json',
    async listPriorities() {
      const items = normalizeRegistryEntries(loadRegistry ? loadRegistry() : registrySchema.parse([]), {
        sourceName: 'json',
      });
      logger?.info?.({ count: items.length }, 'decision priority json repository loaded');
      return {
        items,
        metadata: {
          sourceName: 'json',
          fallbackUsed: false,
          itemCount: items.length,
        },
      };
    },
  };
}

function resolveSanityClient(client) {
  if (client) return client;
  return getSanityClient() || getSanityReadClient();
}

function createSanityPriorityRepository({ client, logger } = {}) {
  return {
    name: 'sanity',
    async listPriorities() {
      const sanityClient = resolveSanityClient(client);
      if (!sanityClient || typeof sanityClient.fetch !== 'function') {
        return {
          items: [],
          metadata: {
            sourceName: 'sanity',
            fallbackUsed: false,
            itemCount: 0,
            unavailable: true,
          },
        };
      }

      const docs = await sanityClient.fetch(SANITY_PRIORITY_QUERY);
      const items = normalizeRegistryEntries(
        Array.isArray(docs) ? docs.map(mapSanityPriority) : [],
        { sourceName: 'sanity' }
      );
      logger?.info?.({ count: items.length }, 'decision priority sanity repository loaded');
      return {
        items,
        metadata: {
          sourceName: 'sanity',
          fallbackUsed: false,
          itemCount: items.length,
        },
      };
    },
  };
}

function createPriorityRepository({
  primaryRepository,
  fallbackRepository,
  logger,
} = {}) {
  const primary = primaryRepository || createSanityPriorityRepository({ logger });
  const fallback = fallbackRepository;

  return {
    async listPriorities() {
      let primaryResult = null;
      try {
        primaryResult = await primary.listPriorities();
        if (primaryResult?.items?.length) {
          return primaryResult;
        }
      } catch (err) {
        logger?.warn?.({ err }, 'decision priority primary repository failed');
      }

      if (!fallback) {
        return primaryResult || {
          items: [],
          metadata: {
            sourceName: primary?.name || 'unknown',
            fallbackUsed: false,
            itemCount: 0,
          },
        };
      }

      const fallbackResult = await fallback.listPriorities();
      return {
        ...fallbackResult,
        metadata: {
          ...(fallbackResult?.metadata || {}),
          fallbackUsed: true,
          requestedPrimarySource: primary?.name || 'unknown',
          sourceName: fallbackResult?.metadata?.sourceName || fallback?.name || 'fallback',
        },
      };
    },
  };
}

module.exports = {
  SANITY_PRIORITY_QUERY,
  createJsonPriorityRepository,
  createPriorityRepository,
  createSanityPriorityRepository,
  mapSanityPriority,
};
