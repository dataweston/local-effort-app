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
      name: 'pizzaCount',
      title: 'Pizza Count (optional)',
      type: 'number',
      description: 'Optional: how many pizzas this reward reserves or represents. If set, the UI will show pizza counts instead of a dollar amount.',
      validation: (Rule) => Rule.min(0),
    },
    {
      name: 'pieCount',
      title: 'Pie Count (optional)',
      type: 'number',
      description: 'Optional: how many pies this reward reserves or represents. If set, the UI will show pie counts instead of a dollar amount.',
      validation: (Rule) => Rule.min(0),
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
      pizzaCount: 'pizzaCount',
      pieCount: 'pieCount',
    },
    prepare(selection) {
      const { title, amount, pizzaCount, pieCount } = selection;
      // Prefer pieCount, then pizzaCount, otherwise show amount
      let subtitle = `$${amount}`;
      if (typeof pieCount === 'number' && pieCount >= 0) subtitle = `${pieCount} pies`;
      else if (typeof pizzaCount === 'number' && pizzaCount >= 0) subtitle = `${pizzaCount} pizzas`;
      return { title: title, subtitle };
    },
  },
}