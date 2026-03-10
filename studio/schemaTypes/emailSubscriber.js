import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'emailSubscriber',
  title: 'Email Subscriber',
  type: 'document',
  fields: [
    defineField({ name: 'email', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'firstName', type: 'string' }),
    defineField({ name: 'lastName', type: 'string' }),
    defineField({ name: 'phone', type: 'string' }),
    defineField({ name: 'source', type: 'string' }),
    defineField({ name: 'status', type: 'string' }),
    defineField({
      name: 'memberState',
      type: 'string',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Past Due', value: 'past_due' },
          { title: 'Canceled', value: 'canceled' },
          { title: 'Inactive', value: 'inactive' },
        ],
      },
    }),
    defineField({
      name: 'activeTierSlugs',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({ name: 'brevoContactId', type: 'string' }),
    defineField({ name: 'listIds', type: 'array', of: [{ type: 'number' }] }),
    defineField({ name: 'pendingTokenHash', type: 'string' }),
    defineField({ name: 'tokenExpiresAt', type: 'datetime' }),
    defineField({ name: 'unsubscribeToken', type: 'string' }),
    defineField({ name: 'confirmedAt', type: 'datetime' }),
    defineField({ name: 'unsubscribedAt', type: 'datetime' }),
    defineField({ name: 'suppressedAt', type: 'datetime' }),
    defineField({ name: 'suppressionReason', type: 'string' }),
    defineField({ name: 'lastBrevoEvent', type: 'string' }),
    defineField({ name: 'lastBrevoEventAt', type: 'datetime' }),
    defineField({ name: 'lastDeliveredAt', type: 'datetime' }),
    defineField({ name: 'lastOpenedAt', type: 'datetime' }),
    defineField({ name: 'lastClickedAt', type: 'datetime' }),
    defineField({ name: 'metadataJson', type: 'text', rows: 4 }),
    defineField({ name: 'createdAt', type: 'datetime' }),
    defineField({ name: 'updatedAt', type: 'datetime' }),
  ],
  preview: {
    select: { title: 'email', subtitle: 'status' },
  },
})
