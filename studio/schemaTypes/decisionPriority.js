import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'decisionPriority',
  title: 'Decision Priority',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'priorityId',
      title: 'Priority ID',
      type: 'string',
      description: 'Stable identifier used by the decision engine and analytics.',
      validation: (rule) =>
        rule
          .required()
          .regex(/^[a-z0-9-]+$/, { name: 'kebab-case id' }),
    }),
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'weight',
      title: 'Weight',
      type: 'number',
      initialValue: 0.5,
      validation: (rule) => rule.required().min(0).max(1),
    }),
    defineField({
      name: 'strategy',
      title: 'Strategy',
      type: 'string',
      initialValue: 'orient',
      options: {
        list: [
          { title: 'Orient', value: 'orient' },
          { title: 'Reassure', value: 'reassure' },
          { title: 'Promote', value: 'promote' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'reasons',
      title: 'Reason Codes',
      type: 'array',
      of: [{ type: 'string' }],
      options: { sortable: true },
    }),
    defineField({
      name: 'audienceTags',
      title: 'Audience Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { sortable: true },
    }),
    defineField({
      name: 'messageFacts',
      title: 'Message Facts',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (rule) => rule.min(1),
      options: { sortable: true },
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA Label',
      type: 'string',
    }),
    defineField({
      name: 'ctaHref',
      title: 'CTA Href',
      type: 'string',
      description: 'Use site-relative paths when possible.',
    }),
    defineField({
      name: 'match',
      title: 'Match Rules',
      type: 'object',
      fields: [
        defineField({
          name: 'pageTypes',
          title: 'Page Types',
          type: 'array',
          of: [{ type: 'string' }],
          options: { sortable: true },
        }),
        defineField({
          name: 'pathPrefixes',
          title: 'Path Prefixes',
          type: 'array',
          of: [{ type: 'string' }],
          options: { sortable: true },
        }),
        defineField({
          name: 'acquisitionSources',
          title: 'Acquisition Sources',
          type: 'array',
          of: [{ type: 'string' }],
          options: { sortable: true },
        }),
        defineField({
          name: 'campaignClasses',
          title: 'Campaign Classes',
          type: 'array',
          of: [{ type: 'string' }],
          options: { sortable: true },
        }),
        defineField({
          name: 'commercialModes',
          title: 'Commercial Modes',
          type: 'array',
          of: [{ type: 'string' }],
          options: { sortable: true },
        }),
      ],
    }),
    defineField({
      name: 'activeWindow',
      title: 'Active Window',
      type: 'object',
      fields: [
        defineField({
          name: 'startAt',
          title: 'Start At',
          type: 'datetime',
        }),
        defineField({
          name: 'endAt',
          title: 'End At',
          type: 'datetime',
        }),
      ],
    }),
    defineField({
      name: 'suppression',
      title: 'Suppression Rules',
      type: 'object',
      fields: [
        defineField({
          name: 'pathPrefixes',
          title: 'Suppress On Path Prefixes',
          type: 'array',
          of: [{ type: 'string' }],
          options: { sortable: true },
        }),
        defineField({
          name: 'acquisitionSources',
          title: 'Suppress On Acquisition Sources',
          type: 'array',
          of: [{ type: 'string' }],
          options: { sortable: true },
        }),
        defineField({
          name: 'commercialModes',
          title: 'Suppress On Commercial Modes',
          type: 'array',
          of: [{ type: 'string' }],
          options: { sortable: true },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'priorityId',
      active: 'active',
      strategy: 'strategy',
      weight: 'weight',
    },
    prepare({ title, subtitle, active, strategy, weight }) {
      return {
        title,
        subtitle: `${subtitle || 'no-id'} | ${strategy || 'strategy'} | ${active === false ? 'inactive' : 'active'} | ${typeof weight === 'number' ? weight.toFixed(2) : '0.00'}`,
      }
    },
  },
})
