// schemas/page.js

export default {
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The main title of the page.',
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      description: 'The URL path for this page (e.g., /about-us).',
    },
    {
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: {
        hotspot: true, // Allows you to crop and position the image
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          description: 'Important for SEO and accessibility.',
        },
      ],
    },
    {
        name: 'headline',
        title: 'Headline',
        type: 'string',
    },
    {
        name: 'subheadline',
        title: 'Subheadline',
        type: 'string',
    },
    {
      name: 'introduction',
      title: 'Introduction',
      type: 'text',
      description: 'A brief introduction that appears at the top of the page.',
    },
    {
      name: 'content',
      title: 'Page Content',
      type: 'array',
      of: [
        {
          type: 'block', // For rich text content
        },
        {
          type: 'image', // To add images within the content
        },
        // You can add other custom block types here later if needed
      ],
      description: 'The main content of the page.',
    },
  ],
  preview: {
    select: {
      title: 'title',
      media: 'heroImage',
    },
  },
}
