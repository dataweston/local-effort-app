export default {
  name: 'pizzaOnSmithPage',
  title: 'Pizza on Smith Page',
  type: 'document',
  description: 'Published text appears on /pizza-on-smith. Product names, prices, descriptions, images, and placement are edited under Store → Products.',
  fields: [
    {
      name: 'dropOpensAt',
      title: 'Ordering opens',
      type: 'datetime',
      description: 'When ordering starts. Checkout and the countdown banner both use this exact time.',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'dropClosesAt',
      title: 'Ordering closes',
      type: 'datetime',
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
      description: 'Shown in the banner, order confirmations and kitchen notes, e.g. “Week of November 2, 2026”.',
      validation: (Rule) => Rule.required(),
    },
    {name: 'headline', title: 'Hero headline', type: 'string'},
    {
      name: 'introduction',
      title: 'Hero introduction',
      type: 'text',
      rows: 3,
      description: 'Describe the pizza. Do not repeat the order dates; the banner under the headline shows them from the fields above.',
    },
    {name: 'seoDescription', title: 'Search / link-preview description', type: 'text', rows: 2, validation: (Rule) => Rule.max(200)},
    {name: 'storyHeading', title: 'Story heading', type: 'string'},
    {name: 'storyText', title: 'Story text', type: 'text', rows: 4},
    {name: 'orderHeading', title: 'Order heading', type: 'string'},
    {name: 'orderIntroduction', title: 'Order introduction', type: 'string'},
    {name: 'pickupHeading', title: 'Pickup heading', type: 'string'},
    {name: 'pickupAddress', title: 'Pickup address', type: 'string'},
    {
      name: 'oliveOilDescription',
      title: 'Olive oil description',
      type: 'text',
      rows: 3,
      description: 'The product name and price come from the olive oil product; this edits the supporting sentence.',
    },
    {name: 'checkoutFootnote', title: 'Checkout footnote', type: 'string'},
    {name: 'journalHeading', title: 'Photo section heading', type: 'string'},
    {name: 'returnToOrderLabel', title: 'Return-to-order link', type: 'string'},
    {
      name: 'notes',
      title: 'Bottom information sections',
      type: 'array',
      description: 'Add, remove, reorder, or rewrite the complete cards at the bottom of the page.',
      validation: (Rule) => Rule.max(6),
      of: [
        {
          type: 'object',
          fields: [
            {name: 'heading', title: 'Heading', type: 'string'},
            {name: 'text', title: 'Text', type: 'text', rows: 3},
          ],
          preview: {select: {title: 'heading', subtitle: 'text'}},
        },
      ],
    },
  ],
  preview: {
    prepare() {
      return {title: 'Pizza on Smith'}
    },
  },
}
