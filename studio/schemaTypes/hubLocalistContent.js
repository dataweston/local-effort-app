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
      description: 'The main update shown above the Localist items.',
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
      description: 'Uncheck to hide this message from the Localist tab.',
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
    },
    prepare({ title, subtitle, active }) {
      return {
        title: title || 'Localist message',
        subtitle: [subtitle, active === false ? '(hidden)' : null].filter(Boolean).join(' - '),
      }
    },
  },
}
