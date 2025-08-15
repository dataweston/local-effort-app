// schemas/siteSettings.js

export default {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Site Title',
      type: 'string',
      description: 'The title of your website, for SEO and the browser tab.',
    },
    {
      name: 'description',
      title: 'Site Description',
      type: 'text',
      description: 'A short description of your website for SEO.',
    },
    {
      name: 'mainNavigation',
      title: 'Main Navigation',
      description: 'Select pages for the main navigation menu.',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'page' }],
        },
      ],
    },
    {
      name: 'footerText',
      title: 'Footer Text',
      type: 'string',
      description: 'Text to display in the website footer.',
    },
  ],
}
