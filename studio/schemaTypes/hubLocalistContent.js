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
      name: 'eyebrow',
      title: 'Small label',
      type: 'string',
      description: 'Short label above the headline.',
      initialValue: 'This week',
    },
    {
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 4,
      description: 'The main update shown above the Hub sales-page items.',
    },
    {
      name: 'note',
      title: 'Footer note',
      type: 'string',
      description: 'Optional short note below the update.',
    },
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
      subtitle: 'headline',
      active: 'active',
      areas: 'areas',
    },
    prepare({ title, subtitle, active, areas }) {
      const areaLabels = (areas || [])
        .map((area) => HUB_SALES_AREA_OPTIONS.find((option) => option.value === area)?.title || area)
        .join(', ')
      return {
        title: title || 'Localist message',
        subtitle: [subtitle, areaLabels, active === false ? '(hidden)' : null].filter(Boolean).join(' / '),
      }
    },
  },
}
