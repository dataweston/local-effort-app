export default {
  name: 'partner',
  title: 'Partner',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'logo',
      title: 'Logo (Cloudinary public ID or Sanity image)',
      type: 'object',
      fields: [
        { name: 'publicId', title: 'Cloudinary public ID', type: 'string' },
        { name: 'asset', title: 'Sanity image', type: 'image' },
      ],
    },
    {
      name: 'url',
      title: 'Website URL',
      type: 'url',
    },
    {
      name: 'order',
      title: 'Sort Order',
      type: 'number',
      initialValue: 0,
    },
    {
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    },
  ],
  preview: {
    select: {
      title: 'name',
      media: 'logo.asset',
    },
  },
}
