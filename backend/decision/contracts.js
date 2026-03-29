const { z } = require('zod');

const hypothesisSchema = z.object({
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  source: z.string().min(1).optional(),
});

const decisionContextSchema = z.object({
  sessionId: z.string().min(1),
  occurredAt: z.string().datetime(),
  page: z.object({
    path: z.string().min(1),
    type: z.string().min(1).optional(),
    routeFamily: z.string().min(1).optional(),
    category: z.string().optional(),
    productSlug: z.string().optional(),
  }),
  acquisition: z.object({
    source: z.string().optional(),
    campaign: z.string().optional(),
    medium: z.string().optional(),
    term: z.string().optional(),
    referrer: z.string().optional(),
    campaignClass: z.string().optional(),
  }).default({}),
  visitor: z.object({
    isReturning: z.boolean().optional(),
    deviceType: z.string().optional(),
    geoRegion: z.string().optional(),
    language: z.string().optional(),
    commercialMode: z.string().optional(),
  }).default({}),
  session: z.object({
    cartItemCount: z.number().int().min(0).default(0),
    viewedProductSlugs: z.array(z.string()).default([]),
    depth: z.enum(['entry', 'engaged', 'deep']).optional(),
    hasHighIntent: z.boolean().optional(),
  }).default({}),
  constraints: z.object({
    maxWords: z.number().int().positive().optional(),
    tone: z.string().optional(),
    mustNotClaim: z.array(z.string()).default([]),
  }).default({}),
});

const businessPrioritySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  weight: z.number().min(0).max(1),
  active: z.boolean().default(true),
  reasons: z.array(z.string()).default([]),
  messageFacts: z.array(z.string()).default([]),
  cta: z.object({
    label: z.string().min(1),
    href: z.string().min(1),
  }).optional(),
});

const priorityMatchSchema = z.object({
  pageTypes: z.array(z.string()).default([]),
  pathPrefixes: z.array(z.string()).default([]),
  acquisitionSources: z.array(z.string()).default([]),
  campaignClasses: z.array(z.string()).default([]),
  commercialModes: z.array(z.string()).default([]),
}).default({});

const priorityRegistryEntrySchema = businessPrioritySchema.extend({
  strategy: z.enum(['orient', 'reassure', 'promote']),
  match: priorityMatchSchema,
  activeWindow: z.object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
  }).optional(),
  audienceTags: z.array(z.string()).default([]),
  suppression: z.object({
    pathPrefixes: z.array(z.string()).default([]),
    acquisitionSources: z.array(z.string()).default([]),
    commercialModes: z.array(z.string()).default([]),
  }).optional(),
  sourceName: z.string().optional(),
  sourceDocumentId: z.string().optional(),
  sourceUpdatedAt: z.string().optional(),
});

const priorityEvaluationSchema = priorityRegistryEntrySchema.extend({
  matched: z.boolean(),
  matchDetails: z.object({
    active: z.boolean(),
    activeWindow: z.boolean(),
    pageType: z.boolean(),
    pathPrefix: z.boolean(),
    acquisitionSource: z.boolean(),
    campaignClass: z.boolean(),
    commercialMode: z.boolean(),
    suppression: z.boolean(),
  }),
});

const decisionAssignmentSchema = z.object({
  experimentKey: z.string().min(1),
  variant: z.string().min(1),
  bucket: z.number().int().min(0).max(9999),
  source: z.string().min(1).default('deterministic_hash'),
});

const decisionCandidateSchema = z.object({
  strategy: z.enum(['orient', 'reassure', 'promote']),
  visitorHypotheses: z.array(hypothesisSchema).default([]),
  businessPriorities: z.array(businessPrioritySchema).default([]),
  welcomeText: z.string().min(1),
  suggestedActions: z.array(z.object({
    label: z.string().min(1),
    href: z.string().min(1),
  })).max(3).default([]),
  reasonCodes: z.array(z.string()).default([]),
});

const decisionResultSchema = z.object({
  version: z.literal('1'),
  context: decisionContextSchema,
  assignment: decisionAssignmentSchema.optional(),
  selected: decisionCandidateSchema,
  alternatives: z.array(decisionCandidateSchema).max(5).default([]),
  debug: z.object({
    prioritySource: z.object({
      sourceName: z.string(),
      fallbackUsed: z.boolean().default(false),
      itemCount: z.number().int().min(0).default(0),
      requestedPrimarySource: z.string().optional(),
      unavailable: z.boolean().optional(),
    }).optional(),
    priorityEvaluations: z.array(priorityEvaluationSchema).default([]),
  }).optional(),
});

const decisionEventSchema = z.object({
  version: z.literal('1'),
  eventType: z.enum([
    'decision.rendered',
    'decision.clicked',
    'decision.dismissed',
    'decision.converted',
  ]),
  occurredAt: z.string().datetime(),
  sessionId: z.string().min(1),
  path: z.string().min(1),
  strategy: z.enum(['orient', 'reassure', 'promote']),
  assignment: decisionAssignmentSchema.optional(),
  reasonCodes: z.array(z.string()).default([]),
  selectedPriorityIds: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
});

module.exports = {
  businessPrioritySchema,
  decisionCandidateSchema,
  decisionAssignmentSchema,
  decisionContextSchema,
  decisionEventSchema,
  decisionResultSchema,
  hypothesisSchema,
  priorityEvaluationSchema,
  priorityMatchSchema,
  priorityRegistryEntrySchema,
};
