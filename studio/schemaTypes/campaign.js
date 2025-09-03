export default {
  name: 'campaign',
  type: 'document',
  title: 'Campaign',
  fields: [
    { name: 'name', type: 'string', title: 'Name' },
    { name: 'slug', type: 'slug', title: 'Slug', options: { source: 'name' } },
    { name: 'status', type: 'string', options: { list: ['draft', 'scheduled', 'sent'] }, title: 'Status' },
    { name: 'segment', type: 'string', title: 'Segment' },
    { name: 'html', type: 'text', title: 'HTML' },
    { name: 'createdAt', type: 'datetime', title: 'Created at' },
    { name: 'scheduledAt', type: 'datetime', title: 'Scheduled at' },
    { name: 'sentAt', type: 'datetime', title: 'Sent at' },
  ],
}
