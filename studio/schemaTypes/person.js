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
    // Optional: Headshot image (native Sanity image)
    {
      name: 'headshot',
      title: 'Headshot',
      type: 'image',
      options: { hotspot: true },
      description: 'Upload a headshot image; add alt text in the image field when available.',
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
