export default {
  name: 'pushSubscription',
  type: 'document',
  title: 'Push Subscription',
  fields: [
    { name: 'userId', type: 'string', title: 'User ID' },
    { name: 'endpoint', type: 'string', title: 'Endpoint' },
    { name: 'keys', type: 'object', fields: [
      { name: 'p256dh', type: 'string' },
      { name: 'auth', type: 'string' },
    ], title: 'Keys' },
    { name: 'createdAt', type: 'datetime', title: 'Created at' },
  ],
}
