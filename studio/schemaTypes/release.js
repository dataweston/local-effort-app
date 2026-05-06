import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'release',
  title: 'Release',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: (r) => r.required() }),
    defineField({ name: 'summary', type: 'text', rows: 3 }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
    defineField({ name: 'metaDescription', type: 'text', rows: 2 }),
    defineField({ name: 'canonicalUrl', type: 'url' }),
    defineField({ name: 'isArchived', title: 'Archived', type: 'boolean', initialValue: false }),
    defineField({
      name: 'mediaContact',
      title: 'Media Contact',
      type: 'object',
      fields: [
        defineField({ name: 'name', type: 'string' }),
        defineField({ name: 'organization', type: 'string' }),
        defineField({ name: 'email', type: 'email' }),
        defineField({ name: 'website', type: 'url' }),
        defineField({ name: 'location', type: 'string' }),
        defineField({ name: 'instagram', type: 'url' }),
        defineField({ name: 'tiktok', type: 'url' }),
      ],
    }),
    defineField({
      name: 'campaignHighlights',
      title: 'Campaign Highlights',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'pressFacts',
      title: 'Press Kit Fast Facts',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', type: 'string' }),
            defineField({ name: 'value', type: 'text', rows: 2 }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'value' },
          },
        },
      ],
    }),
    defineField({
      name: 'leadership',
      title: 'Leadership Bios',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'name', type: 'string' }),
            defineField({ name: 'title', type: 'string' }),
            defineField({ name: 'bio', type: 'text', rows: 3 }),
          ],
          preview: {
            select: { title: 'name', subtitle: 'title' },
          },
        },
      ],
    }),
    defineField({
      name: 'pressAssets',
      title: 'Press Kit Assets',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', type: 'string' }),
            defineField({ name: 'value', type: 'string' }),
            defineField({ name: 'href', type: 'string' }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'value' },
          },
        },
      ],
    }),
    defineField({ name: 'pressKitUrl', title: 'Press Kit PDF URL', type: 'url' }),
    defineField({
      name: 'storyAngles',
      title: 'Story Angles',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'heroImage',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true }, fields: [{ name: 'alt', type: 'string', title: 'Alt text' }] },
      ],
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'publishedAt' },
  },
})
