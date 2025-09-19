// schemas/publicEvent.js

export default {
  name: 'publicEvent',
  title: 'Public Event',
  type: 'document',
  fields: [
    { name: 'location', title: 'Location', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'startDate', title: 'Start Date', type: 'date', validation: (Rule) => Rule.required() },
    { name: 'endDate', title: 'End Date (optional)', type: 'date' },
    { name: 'foodType', title: 'Type of Food', type: 'string' },
    { name: 'ticketsUrl', title: 'Tickets URL', type: 'url' },
    { name: 'description', title: 'Description', type: 'array', of: [{ type: 'block' }] },
    { name: 'firestoreEventId', title: 'Firestore Event ID', type: 'string' },
  ],
  preview: {
    select: { title: 'location', start: 'startDate', end: 'endDate' },
    prepare({ title, start, end }) {
      const dates = end ? `${start}–${end}` : start;
      return { title, subtitle: dates };
    },
  },
}
