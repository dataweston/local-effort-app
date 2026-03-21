import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: (r) => r.required() }),
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'person' }] }],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'Primary section label shown in Local Report navigation and post headers.',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'visibility',
      type: 'string',
      initialValue: 'public',
      options: {
        list: [
          { title: 'Public', value: 'public' },
          { title: 'Members', value: 'members' },
          { title: 'Paid', value: 'paid' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'requiredTierSlugs',
      title: 'Required Tier Slugs',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      hidden: ({ document }) => (document?.visibility || 'public') !== 'paid',
      description: 'Only used when Visibility is Paid. Add tier slugs such as "member-plus".',
    }),
    defineField({ name: 'excerpt', type: 'text' }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
    defineField({ name: 'canonicalUrl', type: 'url' }),
    defineField({ name: 'metaTitle', type: 'string' }),
    defineField({ name: 'metaDescription', type: 'text', rows: 3 }),
    defineField({
      name: 'mainImage',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt Text' })],
    }),
    defineField({
      name: 'ogImage',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Open Graph Alt Text' })],
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true }, fields: [{ name: 'alt', type: 'string', title: 'Alt Text' }] },
        // Replaced direct cloudinary.asset with wrapper object type to avoid unknown type error
        { type: 'cloudinaryImage', title: 'Cloudinary Image' },
      ],
    }),
    defineField({
      name: 'newsletter',
      type: 'reference',
      to: [{ type: 'newsletter' }],
    }),
    defineField({
      name: 'emailSegment',
      type: 'string',
      initialValue: 'all_subscribers',
      options: {
        list: [
          { title: 'All Subscribers', value: 'all_subscribers' },
          { title: 'Members', value: 'members' },
          { title: 'Paid Members', value: 'paid_members' },
          { title: 'Custom Segment', value: 'custom' },
        ],
      },
    }),
    defineField({ name: 'emailOnPublish', type: 'boolean', initialValue: true }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'publishedAt', media: 'mainImage' }
  }
})
