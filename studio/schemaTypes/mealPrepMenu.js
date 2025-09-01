// studio/schemaTypes/mealPrepMenu.js
export default {
  name: 'mealPrepMenu',
  title: 'Meal Prep Menu',
  type: 'document',
  fields: [
    {
      name: 'date',
      title: 'Week Of',
      type: 'date',
      options: { dateFormat: 'YYYY-MM-DD', calendarTodayLabel: 'Today' },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'clientName',
      title: 'Client Name',
      type: 'string',
      validation: (Rule) => Rule.required().min(2),
    },
    {
      name: 'menu',
      title: 'Menu Items',
      description: 'List each meal or item for the week',
      type: 'array',
      of: [{ type: 'string', title: 'Item' }],
      validation: (Rule) => Rule.required().min(1),
    },
    {
      name: 'notes',
      title: 'Chef Notes (optional)',
      type: 'text',
      rows: 3,
    },
    {
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    },
  ],
  preview: {
    select: { title: 'clientName', date: 'date' },
    prepare: ({ title, date }) => ({
      title: `${title || 'Untitled Client'}`,
      subtitle: date ? `Week of ${date}` : 'No date set',
    }),
  },
};
