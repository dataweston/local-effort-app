export default {
  name: 'hubLocalistItem',
  title: 'Localist Menu Item',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    },
    {
      name: 'price',
      title: 'Price',
      type: 'string',
      description: 'Display price, e.g. "$28" or "Market price".',
    },
    {
      name: 'order',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers appear first.',
      initialValue: 0,
    },
    {
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Uncheck to hide this item from the order form.',
      initialValue: true,
    },
  ],
  orderings: [
    {
      title: 'Sort order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'price', active: 'active' },
    prepare({ title, subtitle, active }) {
      return {
        title: title || 'Untitled item',
        subtitle: [subtitle, active === false ? '(hidden)' : null].filter(Boolean).join(' · '),
      }
    },
  },
}
