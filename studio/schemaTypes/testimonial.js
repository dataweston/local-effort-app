export default {
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    { name: 'author', title: 'Author', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'context', title: 'Context', type: 'string' },
    { name: 'quote', title: 'Quote', type: 'text', rows: 3, validation: (Rule) => Rule.required() },
    { name: 'order', title: 'Order', type: 'number' },
    { name: 'published', title: 'Published', type: 'boolean', initialValue: true },
  ],
  preview: {
    select: { title: 'author', subtitle: 'context' },
  },
};
