// schemas/dinnerEvent.js
// Ticketed dinner events sold directly on the site (e.g. /julydinner).
// Content lives here; transactions run through Square via the site checkout.

export default {
  name: 'dinnerEvent',
  title: 'Dinner Event (ticketed)',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      description: 'Must match the page fetch, e.g. "july-dinner" for /julydinner.',
      validation: (Rule) => Rule.required(),
    },
    { name: 'dateLabel', title: 'Date label', type: 'string', description: 'Displayed as-is, e.g. "Saturday, July 25, 2026".' },
    { name: 'timeLabel', title: 'Time label', type: 'string', description: 'e.g. "6:30 PM seating".' },
    { name: 'eventDateTime', title: 'Event date/time (for SEO)', type: 'datetime' },
    { name: 'location', title: 'Location name', type: 'string' },
    { name: 'locationDetails', title: 'Location details', type: 'string', description: 'Address or extra directions.' },
    {
      name: 'priceCents',
      title: 'Price per seat (cents)',
      type: 'number',
      description: 'e.g. 7000 = $70. Checkout charges this server-side.',
    },
    { name: 'capacity', title: 'Total seats', type: 'number' },
    {
      name: 'buyoutPriceCents',
      title: 'Buy-out price (cents)',
      type: 'number',
      description: 'Flat price to book the entire night, e.g. 255000 = $2,550. Food and service included, beverages not.',
    },
    {
      name: 'buyoutCapacity',
      title: 'Buy-out max party size',
      type: 'number',
      description: 'e.g. 30. Only offered while zero seats have been sold.',
    },
    { name: 'summary', title: 'Summary', type: 'text', rows: 4, description: 'Short pitch shown at the top of the page.' },
    { name: 'included', title: 'What is included', type: 'text', rows: 3 },
    {
      name: 'beverageNote',
      title: 'Beverage note',
      type: 'text',
      rows: 2,
      description: 'e.g. "A non-alcoholic beverage is included; more options available the night of."',
    },
    {
      name: 'menu',
      title: 'Menu',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'course', title: 'Course', type: 'string' },
            { name: 'description', title: 'Description', type: 'string' },
          ],
          preview: { select: { title: 'course', subtitle: 'description' } },
        },
      ],
      description: 'Leave empty to show "Menu to be announced."',
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'On sale', value: 'onSale' },
          { title: 'Sold out (manual override)', value: 'soldOut' },
          { title: 'Cancelled', value: 'cancelled' },
        ],
      },
      initialValue: 'onSale',
    },
    { name: 'heroImage', title: 'Hero image', type: 'image', options: { hotspot: true } },
  ],
  preview: {
    select: { title: 'title', subtitle: 'dateLabel' },
  },
}
