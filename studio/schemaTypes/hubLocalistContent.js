import {richTextBlock} from './objects/richTextBlock'

const HUB_SALES_AREA_OPTIONS = [
  { title: 'Localist', value: 'localist' },
  { title: 'Security at Neon', value: 'security' },
]

export default {
  name: 'hubLocalistContent',
  title: 'Localist Intro',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Internal title',
      type: 'string',
      description: 'Used in Studio lists only.',
      initialValue: 'Current Localist message',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'areas',
      title: 'Hub sales areas',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: HUB_SALES_AREA_OPTIONS,
        layout: 'grid',
      },
      description: 'Choose where this intro appears. Existing blank intros still appear on Localist.',
      initialValue: ['localist'],
      validation: (Rule) => Rule.unique(),
    },
    {
      name: 'eyebrowRich',
      title: 'Small label',
      type: 'array',
      of: [richTextBlock()],
      description: 'Short label above the headline.',
    },
    {
      name: 'headlineRich',
      title: 'Headline',
      type: 'array',
      of: [richTextBlock()],
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'bodyRich',
      title: 'Body',
      type: 'array',
      of: [richTextBlock()],
      description: 'The main update shown above the Hub sales-page items.',
    },
    {
      name: 'noteRich',
      title: 'Footer note',
      type: 'array',
      of: [richTextBlock()],
      description: 'Optional short note below the update.',
    },
    {name: 'eyebrow', type: 'string', hidden: true, readOnly: true},
    {name: 'headline', type: 'string', hidden: true, readOnly: true},
    {name: 'body', type: 'text', hidden: true, readOnly: true},
    {name: 'note', type: 'string', hidden: true, readOnly: true},
    {
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Uncheck to hide this message from the sales page.',
      initialValue: true,
    },
  ],
  orderings: [
    {
      title: 'Recently updated',
      name: 'updatedDesc',
      by: [{ field: '_updatedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'headlineRich',
      active: 'active',
      areas: 'areas',
    },
    prepare({ title, subtitle, active, areas }) {
      const subtitleText = Array.isArray(subtitle)
        ? subtitle.flatMap((block) => block.children || []).map((child) => child.text || '').join(' ')
        : subtitle
      const areaLabels = (areas || [])
        .map((area) => HUB_SALES_AREA_OPTIONS.find((option) => option.value === area)?.title || area)
        .join(', ')
      return {
        title: title || 'Localist message',
        subtitle: [subtitleText, areaLabels, active === false ? '(hidden)' : null].filter(Boolean).join(' / '),
      }
    },
  },
}
