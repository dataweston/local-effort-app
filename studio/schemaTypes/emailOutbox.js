import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'emailOutbox',
  title: 'Email Outbox',
  type: 'document',
  fields: [
    defineField({ name: 'status', type: 'string' }),
    defineField({ name: 'attempts', type: 'number' }),
    defineField({ name: 'idempotencyKey', type: 'string' }),
    defineField({ name: 'category', type: 'string' }),
    defineField({ name: 'source', type: 'string' }),
    defineField({ name: 'nextAttemptAt', type: 'datetime' }),
    defineField({ name: 'processingStartedAt', type: 'datetime' }),
    defineField({ name: 'processingLock', type: 'string' }),
    defineField({ name: 'sentAt', type: 'datetime' }),
    defineField({ name: 'finishedAt', type: 'datetime' }),
    defineField({ name: 'lastError', type: 'text' }),
    defineField({ name: 'lastErrorAt', type: 'datetime' }),
    defineField({ name: 'deadLetterReason', type: 'string' }),
    defineField({ name: 'recipientCount', type: 'number' }),
    defineField({ name: 'payload', type: 'object' }),
    defineField({ name: 'context', type: 'object' }),
    defineField({ name: 'createdAt', type: 'datetime' }),
    defineField({ name: 'updatedAt', type: 'datetime' }),
  ],
  preview: {
    select: { title: '_id', subtitle: 'status' },
  },
})
