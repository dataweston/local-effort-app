// schemas/pricingFaq.js

export default {
  name: 'pricingFaq',
  title: 'Pricing FAQ',
  type: 'document',
  fields: [
    {
      name: 'question',
      title: 'Question',
      type: 'string',
    },
    {
      name: 'answer',
      title: 'Answer',
      type: 'text',
    },
  ],
}
