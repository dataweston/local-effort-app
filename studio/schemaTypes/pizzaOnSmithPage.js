export default {
  name: 'pizzaOnSmithPage',
  title: 'Pizza on Smith Page',
  type: 'document',
  description: 'Published text appears on /pizza-on-smith. Product names, prices, descriptions, images, and placement are edited under Store → Products.',
  fields: [
    {name: 'eyebrow', title: 'Hero eyebrow', type: 'string'},
    {name: 'headline', title: 'Hero headline', type: 'string'},
    {name: 'introduction', title: 'Hero introduction', type: 'text', rows: 3},
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
    {name: 'journalEyebrow', title: 'Photo section eyebrow', type: 'string'},
    {name: 'journalHeading', title: 'Photo section heading', type: 'string'},
    {name: 'returnToOrderLabel', title: 'Return-to-order link', type: 'string'},
    {
      name: 'notes',
      title: 'Bottom information sections (including “Your Tuesday stop”)',
      type: 'array',
      description: 'Add, remove, reorder, or rewrite the complete cards at the bottom of the page.',
      validation: (Rule) => Rule.max(6),
      of: [
        {
          type: 'object',
          fields: [
            {name: 'label', title: 'Small label', type: 'string'},
            {name: 'heading', title: 'Heading', type: 'string'},
            {name: 'text', title: 'Text', type: 'text', rows: 3},
          ],
          preview: {select: {title: 'heading', subtitle: 'label'}},
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
