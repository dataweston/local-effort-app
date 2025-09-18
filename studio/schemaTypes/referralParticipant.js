// schemas/referralParticipant.js

export default {
  name: 'referralParticipant',
  title: 'Referral Participant',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'email', title: 'Email', type: 'string' },
    { name: 'code', title: 'Referral Code', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'notes', title: 'Notes', type: 'text' },
    { name: 'createdAt', title: 'Created At', type: 'datetime', initialValue: () => new Date().toISOString() },
  ],
  preview: {
    select: { title: 'name', subtitle: 'code' },
  },
}
