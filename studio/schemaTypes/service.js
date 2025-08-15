// schemas/service.js

export default {
  name: 'service',
  title: 'Service',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'e.g., Weekly Meal Prep',
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
      },
      description: 'The URL path for this service page.',
    },
    {
      name: 'description',
      title: 'Short Description',
      type: 'string',
      description: 'A brief, one-sentence description for cards and previews.',
    },
    {
      name: 'pageContent',
      title: 'Page Content',
      type: 'reference',
      to: [{ type: 'page' }],
      description: 'Link to the full page describing this service.',
    },
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
}
