import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'membershipTier',
  title: 'Membership Tier',
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
    defineField({ name: 'priceLabel', type: 'string' }),
    defineField({ name: 'billingInterval', type: 'string', initialValue: 'monthly' }),
    defineField({ name: 'brevoListId', type: 'number' }),
    defineField({ name: 'isActive', type: 'boolean', initialValue: true }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'priceLabel',
    },
  },
})
