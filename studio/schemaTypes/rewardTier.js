// schemas/rewardTier.js
export default {
  name: 'rewardTier',
  title: 'Reward Tier',
  type: 'document',
  fields: [
    {
      name: 'amount',
      title: 'Pledge Amount',
      type: 'number',
      validation: (Rule) => Rule.required().min(1),
    },
    {
      name: 'title',
      title: 'Tier Title',
      type: 'string',
      description: 'e.g., "Early Bird Supporter"',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Tier Description',
      type: 'text',
      description: 'What do backers get for this pledge?',
    },
    {
      name: 'limit',
      title: 'Quantity Limit',
      type: 'number',
      description: 'Optional: Limit the number of backers for this tier.',
    },
  ],
  preview: {
    select: {
      title: 'title',
      amount: 'amount',
    },
    prepare({title, amount}) {
      return {
        title: title,
        subtitle: `$${amount}`,
      }
    },
  },
}