// schemas/person.js

export default {
  name: 'person',
  title: 'Person',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
    // Optional: Cloudinary-powered headshot; preferred if you use Cloudinary across the site
    {
      name: 'headshot',
      title: 'Headshot (Cloudinary)',
      type: 'cloudinaryImage',
      description: 'Preferred image source; provides a Cloudinary public_id for optimized delivery.',
    },
    {
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g., Chef de Cuisine, Director',
    },
    {
      name: 'bio',
      title: 'Bio',
      type: 'text',
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      media: 'image',
    },
  },
}
