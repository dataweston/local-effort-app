import {pageRichText} from './objects/richTextBlock'

const richText = {type: 'array', of: [pageRichText()]}

export default {
  name: 'pizzaOnSmithPage',
  title: 'Pizza on Smith Page',
  type: 'document',
  description: 'Published text and photos appear on /pizza-on-smith. Product names, prices, descriptions, images, and placement are edited under Store → Products.',
  groups: [
    {name: 'ordering', title: 'Order window', default: true},
    {name: 'copy', title: 'Page text'},
    {name: 'photos', title: 'Photos'},
  ],
  fields: [
    {
      name: 'dropOpensAt',
      title: 'Ordering opens',
      type: 'datetime',
      group: 'ordering',
      description: 'When ordering starts. Checkout and the countdown banner both use this exact time.',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'dropClosesAt',
      title: 'Ordering closes',
      type: 'datetime',
      group: 'ordering',
      description: 'Last moment orders are accepted. After this the page shows the drop as closed and checkout refuses new orders.',
      validation: (Rule) =>
        Rule.required().custom((value, context) =>
          value && context.document?.dropOpensAt && Date.parse(value) <= Date.parse(context.document.dropOpensAt)
            ? 'Ordering must close after it opens.'
            : true,
        ),
    },
    {
      name: 'fulfillmentLabel',
      title: 'Fulfillment timing',
      type: 'string',
      group: 'ordering',
      description: 'Shown in the banner, order confirmations and kitchen notes, e.g. “Week of November 2, 2026”.',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'headline',
      title: 'Hero headline',
      type: 'text',
      rows: 2,
      group: 'copy',
      description: 'Press Enter for a line break.',
    },
    {
      ...richText,
      name: 'introduction',
      title: 'Hero introduction',
      group: 'copy',
      description: 'Describe the pizza. Do not repeat the order dates; the banner under the headline shows them from the fields above. Shift+Enter makes a line break inside a paragraph.',
    },
    {name: 'seoDescription', title: 'Search / link-preview description', type: 'text', rows: 2, group: 'copy', description: 'Plain text only: search engines and link previews do not show formatting.', validation: (Rule) => Rule.max(200)},
    {name: 'storyHeading', title: 'Story heading', type: 'text', rows: 2, group: 'copy', description: 'Press Enter for a line break.'},
    {...richText, name: 'storyText', title: 'Story text', group: 'copy'},
    {name: 'orderHeading', title: 'Order heading', type: 'string', group: 'copy'},
    {...richText, name: 'orderIntroduction', title: 'Order introduction', group: 'copy'},
    {name: 'pickupHeading', title: 'Pickup heading', type: 'string', group: 'copy'},
    {name: 'pickupAddress', title: 'Pickup address', type: 'string', group: 'copy'},
    {
      ...richText,
      name: 'oliveOilDescription',
      title: 'Olive oil description',
      group: 'copy',
      description: 'The product name and price come from the olive oil product; this edits the supporting sentence.',
    },
    {name: 'checkoutFootnote', title: 'Checkout footnote', type: 'string', group: 'copy'},
    {name: 'journalHeading', title: 'Photo section heading', type: 'string', group: 'copy'},
    {name: 'returnToOrderLabel', title: 'Return-to-order link', type: 'string', group: 'copy'},
    {
      name: 'notes',
      title: 'Bottom information sections',
      type: 'array',
      group: 'copy',
      description: 'Add, remove, reorder, or rewrite the complete cards at the bottom of the page.',
      validation: (Rule) => Rule.max(6),
      of: [
        {
          type: 'object',
          fields: [
            {name: 'heading', title: 'Heading', type: 'string'},
            {...richText, name: 'text', title: 'Text'},
          ],
          preview: {
            select: {title: 'heading'},
            prepare({title}) {
              return {title: title || 'Untitled section'}
            },
          },
        },
      ],
    },
    {
      name: 'galleryPhotos',
      title: 'Main photos',
      type: 'array',
      group: 'photos',
      description: 'The large photo carousel at the top, in this order. The first one is also the picture shown when the page is shared. Photos are cropped to portrait (3:4) around the subject, so choose upright shots. Drag to reorder.',
      of: [{type: 'pizzaPhoto'}],
      options: {layout: 'grid'},
      validation: (Rule) => Rule.required().min(1).max(12),
    },
    {
      name: 'detailPhoto',
      title: 'Close-up photo',
      type: 'pizzaPhoto',
      group: 'photos',
      description: 'Shown between the carousel and the story. Leave empty to show nothing there.',
    },
    {
      name: 'journalPhotos',
      title: 'Photo section',
      type: 'array',
      group: 'photos',
      description: 'The grid below the order form. The first photo is shown wide (3:2, so choose a landscape shot); the rest are portrait (3:4).',
      of: [{type: 'pizzaPhoto'}],
      options: {layout: 'grid'},
      validation: (Rule) => Rule.max(8),
    },
  ],
  preview: {
    prepare() {
      return {title: 'Pizza on Smith'}
    },
  },
}
