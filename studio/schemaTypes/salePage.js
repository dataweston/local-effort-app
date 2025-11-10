// schemas/salePage.js

export default {
  name: 'salePage',
  title: 'Sale Page',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title (H1)',
      type: 'string',
      description: 'Main title/heading for the sale page.',
      validation: Rule => Rule.required(),
    },
    {
      name: 'subheading',
      title: 'Subtitle (H2)',
      type: 'string',
      description: 'Short subtitle shown under the main title.',
    },
    {
      name: 'intro',
      title: 'Intro Text',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Optional text shown under the subtitle to explain the sale.',
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'subheading' },
    prepare({ title, subtitle }) { return { title: title || 'Sale Page', subtitle }; },
  },
}
