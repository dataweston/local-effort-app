export default {
  name: 'cloudinaryImage',
  type: 'object',
  title: 'Cloudinary Image',
  fields: [
    {
      name: 'asset',
      type: 'cloudinary.asset', // This type is provided by the plugin
      title: 'Cloudinary Asset',
      description: 'Select or upload an image from Cloudinary',
    },
    {
      name: 'alt',
      type: 'string',
      title: 'Alternative Text',
      description: 'Crucial for SEO and accessibility. Describe the image content.',
      validation: Rule => Rule.required(),
    },
  ],
  preview: {
    select: {
      public_id: 'asset.public_id',
      alt: 'alt',
    },
    prepare({ public_id, alt }) {
      return {
        title: alt || 'Image',
        subtitle: public_id,
      };
    },
  },
};