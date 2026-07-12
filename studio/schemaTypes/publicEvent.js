// schemas/publicEvent.js
import { richTextBlock } from './objects/richTextBlock'

export default {
  name: 'publicEvent',
  title: 'Public Event',
  type: 'document',
  fields: [
    { name: 'location', title: 'Location', type: 'string', validation: (Rule) => Rule.required() },
    {
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Optional one-line highlight that appears in card previews.',
    },
    {
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      description: 'Short summary shown in event cards before someone opens the full details.',
    },
    { name: 'startDate', title: 'Start Date', type: 'date', validation: (Rule) => Rule.required() },
    { name: 'endDate', title: 'End Date (optional)', type: 'date' },
    {
      name: 'timingNote',
      title: 'Timing Note',
      type: 'string',
      description: 'Optional information such as "5:00-8:00 PM" displayed alongside the event date.',
    },
    { name: 'foodType', title: 'Type of Food', type: 'string' },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Scheduled', value: 'scheduled' },
          { title: 'Sold out', value: 'soldOut' },
          { title: 'Postponed', value: 'postponed' },
          { title: 'Cancelled', value: 'cancelled' },
        ],
      },
      initialValue: 'scheduled',
    },
    { name: 'ticketsUrl', title: 'Tickets URL', type: 'url' },
    {
      name: 'ctaLabel',
      title: 'CTA Label',
      type: 'string',
      description: 'Override for the tickets button (defaults to "Get tickets").',
    },
    {
      name: 'locationDetails',
      title: 'Location Details',
      type: 'string',
      description: 'Optional address, suite, or room info displayed inside the dialog.',
    },
    {
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Optional image displayed in cards and the event dialog. Use 16:9 if possible.',
    },
    { name: 'description', title: 'Description', type: 'array', of: [richTextBlock()] },
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
