export default {
  name: 'cloudinaryImage',
  type: 'object',
  title: 'Cloudinary Image',
  fields: [
    {
      name: 'asset',
      // Defaulting to 'image' to avoid Unknown type error if cloudinary plugin not installed.
      // If you add the Sanity Cloudinary plugin, change this back to 'cloudinary.asset'.
      type: 'image',
      title: 'Cloudinary Asset',
      description: 'Upload an image (Cloudinary plugin not detected, using standard image type).',
      options: { hotspot: true },
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