// schemas/salePage.js

export default {
  name: 'salePage',
  title: 'Sale Page',
  type: 'document',
  fields: [
    {
      name: 'subheading',
      title: 'Subheading',
      type: 'string',
      description: 'Short subheading shown under the Sale title.',
    },
    {
      name: 'intro',
      title: 'Intro Text',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Optional text shown under the title to explain the sale.',
    },
  ],
  preview: {
    select: { title: 'subheading' },
    prepare({ title }) { return { title: title || 'Sale Page' }; },
  },
}
