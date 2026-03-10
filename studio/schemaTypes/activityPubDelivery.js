import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'activityPubDelivery',
  title: 'ActivityPub Delivery',
  type: 'document',
  fields: [
    defineField({ name: 'status', type: 'string' }),
    defineField({ name: 'attempts', type: 'number' }),
    defineField({ name: 'idempotencyKey', type: 'string' }),
    defineField({ name: 'activityId', type: 'string' }),
    defineField({ name: 'activityType', type: 'string' }),
    defineField({ name: 'actorId', type: 'url' }),
    defineField({ name: 'inboxUrl', type: 'url' }),
    defineField({ name: 'nextAttemptAt', type: 'datetime' }),
    defineField({ name: 'processingStartedAt', type: 'datetime' }),
    defineField({ name: 'processingLock', type: 'string' }),
    defineField({ name: 'lastAttemptAt', type: 'datetime' }),
    defineField({ name: 'finishedAt', type: 'datetime' }),
    defineField({ name: 'lastError', type: 'text' }),
    defineField({ name: 'lastErrorAt', type: 'datetime' }),
    defineField({ name: 'lastResponseCode', type: 'number' }),
    defineField({ name: 'deadLetterReason', type: 'string' }),
    defineField({ name: 'payloadJson', type: 'text', rows: 10 }),
    defineField({ name: 'createdAt', type: 'datetime' }),
    defineField({ name: 'updatedAt', type: 'datetime' }),
  ],
  preview: {
    select: {
      title: 'activityType',
      subtitle: 'status',
    },
  },
})
