import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'activityPubFollower',
  title: 'ActivityPub Follower',
  type: 'document',
  fields: [
    defineField({ name: 'actorId', type: 'url', validation: (rule) => rule.required() }),
    defineField({ name: 'actorType', type: 'string' }),
    defineField({ name: 'inboxUrl', type: 'url' }),
    defineField({ name: 'sharedInboxUrl', type: 'url' }),
    defineField({ name: 'profileUrl', type: 'url' }),
    defineField({ name: 'status', type: 'string' }),
    defineField({ name: 'publicKeyPem', type: 'text', rows: 6 }),
    defineField({ name: 'inactiveReason', type: 'string' }),
    defineField({ name: 'lastSeenAt', type: 'datetime' }),
    defineField({ name: 'lastFollowedAt', type: 'datetime' }),
    defineField({ name: 'lastUnfollowedAt', type: 'datetime' }),
    defineField({ name: 'createdAt', type: 'datetime' }),
    defineField({ name: 'updatedAt', type: 'datetime' }),
  ],
  preview: {
    select: {
      title: 'actorId',
      subtitle: 'status',
    },
  },
})
