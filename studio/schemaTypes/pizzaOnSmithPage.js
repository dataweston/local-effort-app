export default {
  name: 'pizzaOnSmithPage',
  title: 'Pizza on Smith Page',
  type: 'document',
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
    {name: 'journalEyebrow', title: 'Photo section eyebrow', type: 'string'},
    {name: 'journalHeading', title: 'Photo section heading', type: 'string'},
    {
      name: 'notes',
      title: 'Bottom information sections',
      type: 'array',
      validation: (Rule) => Rule.max(3),
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
