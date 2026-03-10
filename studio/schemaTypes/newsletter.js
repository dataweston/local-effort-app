import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'newsletter',
  title: 'Newsletter',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({ name: 'senderName', type: 'string' }),
    defineField({ name: 'senderEmail', type: 'string' }),
    defineField({ name: 'brevoListId', type: 'number' }),
    defineField({ name: 'defaultFromName', type: 'string' }),
    defineField({ name: 'defaultReplyTo', type: 'string' }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'slug.current',
    },
  },
})
