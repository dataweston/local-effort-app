export default {
  name: 'saleFaq',
  title: 'FAQ Item',
  type: 'object',
  fields: [
    {
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    {
      name: 'answer',
      title: 'Answer',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required()
    }
  ],
  preview: {
    select: { title: 'question' }
  }
}
