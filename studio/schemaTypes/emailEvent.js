import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'emailEvent',
  title: 'Email Event',
  type: 'document',
  fields: [
    defineField({ name: 'email', type: 'string' }),
    defineField({ name: 'eventType', type: 'string' }),
    defineField({ name: 'provider', type: 'string' }),
    defineField({ name: 'occurredAt', type: 'datetime' }),
    defineField({ name: 'payload', type: 'text' }),
    defineField({ name: 'createdAt', type: 'datetime' }),
  ],
  preview: {
    select: { title: 'email', subtitle: 'eventType' },
  },
})
