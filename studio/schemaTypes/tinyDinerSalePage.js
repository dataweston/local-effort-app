// schemas/tinyDinerSalePage.js
import { richTextBlock } from './objects/richTextBlock'

export default {
  name: 'tinyDinerSalePage',
  title: 'Tiny Diner Sale Page',
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
      of: [richTextBlock()],
      description: 'Optional text shown under the title to explain the sale.',
    },
  ],
  preview: {
    select: { title: 'subheading' },
    prepare({ title }) { return { title: title || 'Tiny Diner Sale Page' }; },
  },
}
