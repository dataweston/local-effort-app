const layoutOptions = [
  { title: 'Standard', value: 'standard' },
  { title: 'Paikka', value: 'paikka' }
]

export default {
  name: 'sale',
  title: 'Sale',
  type: 'document',
  groups: [
    { name: 'overview', title: 'Overview' },
    { name: 'theme', title: 'Theme' },
    { name: 'content', title: 'Content Blocks' },
    { name: 'products', title: 'Products' },
    { name: 'integrations', title: 'Integrations' },
    { name: 'messaging', title: 'Messaging' },
    { name: 'analytics', title: 'Analytics & Tracking' },
    { name: 'seo', title: 'SEO & Meta' },
    { name: 'operations', title: 'Operations' }
  ],
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'overview',
      validation: (Rule) => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'overview',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required()
    },
    {
      name: 'layoutVariant',
      title: 'Layout Variant',
      type: 'string',
      group: 'overview',
      options: { list: layoutOptions, layout: 'radio' },
      initialValue: 'standard'
    },
    {
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      group: 'overview'
    },
    {
      name: 'hero',
      title: 'Hero Content',
      type: 'object',
      group: 'overview',
      options: { collapsible: true, collapsed: true },
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'string' },
        { name: 'heading', title: 'Heading', type: 'string' },
        { name: 'subheading', title: 'Subheading', type: 'text', rows: 2 },
        { name: 'body', title: 'Body', type: 'text', rows: 4 },
        {
          name: 'image',
          title: 'Hero Image',
          type: 'image',
          options: { hotspot: true }
        }
      ]
    },
    {
      name: 'pickupWindow',
      title: 'Pickup Window',
      type: 'object',
      group: 'overview',
      options: { collapsible: true, collapsed: true },
      fields: [
        { name: 'timezone', title: 'Timezone', type: 'string', initialValue: 'America/Chicago' },
        { name: 'start', title: 'Start', type: 'datetime' },
        { name: 'end', title: 'End', type: 'datetime' },
        { name: 'instructions', title: 'Pickup Instructions', type: 'text', rows: 3 },
        { name: 'locationName', title: 'Location Name', type: 'string' },
        {
          name: 'addressLines',
          title: 'Address Lines',
          type: 'array',
          of: [{ type: 'string' }],
          description: 'Each line will be rendered on its own.'
        }
      ]
    },
    {
      name: 'theme',
      title: 'Theme',
      type: 'object',
      group: 'theme',
      options: { collapsible: true, collapsed: true },
      fields: [
        { name: 'backgroundColor', title: 'Background Color', type: 'color' },
        { name: 'foregroundColor', title: 'Foreground Color', type: 'color' },
        { name: 'surfaceColor', title: 'Surface Color', type: 'color' },
        { name: 'borderColor', title: 'Border Color', type: 'color' },
        { name: 'mutedColor', title: 'Muted Text Color', type: 'color' },
        { name: 'accentColor', title: 'Accent Color', type: 'color' },
        {
          name: 'cardStyle',
          title: 'Card Style',
          type: 'string',
          options: {
            list: [
              { title: 'Solid', value: 'solid' },
              { title: 'Frosted', value: 'frosted' }
            ]
          }
        },
        {
          name: 'buttonVariant',
          title: 'Button Variant',
          type: 'string',
          options: {
            list: [
              { title: 'Solid', value: 'solid' },
              { title: 'Outline', value: 'outline' }
            ]
          }
        },
        {
          name: 'heroVariant',
          title: 'Hero Variant',
          type: 'string',
          options: {
            list: [
              { title: 'Default', value: 'default' },
              { title: 'Compact', value: 'compact' }
            ]
          }
        }
      ]
    },
    {
      name: 'faqs',
      title: 'FAQ',
      type: 'array',
      group: 'content',
      of: [{ type: 'saleFaq' }],
      options: { sortable: true },
      description: 'Optional frequently asked questions rendered on the sale page.'
    },
    {
      name: 'products',
      title: 'Products',
      type: 'array',
      group: 'products',
      of: [{ type: 'saleProduct' }],
      validation: (Rule) => Rule.min(1).warning('Add at least one product to publish the sale.')
    },
    {
      name: 'square',
      title: 'Square Settings',
      type: 'object',
      group: 'integrations',
      options: { collapsible: true, collapsed: true },
      fields: [
        { name: 'locationId', title: 'Square Location ID', type: 'string' },
        {
          name: 'checkoutMode',
          title: 'Checkout Mode',
          type: 'string',
          options: {
            list: [
              { title: 'Checkout Link (Tier A)', value: 'link' },
              { title: 'Inline Checkout (Tier B)', value: 'inline' }
            ]
          }
        },
        { name: 'webhookTag', title: 'Webhook Tag', type: 'string' }
      ]
    },
    {
      name: 'email',
      title: 'Email Settings',
      type: 'object',
      group: 'messaging',
      options: { collapsible: true, collapsed: true },
      fields: [
        { name: 'brevoTemplateId', title: 'Brevo Template ID', type: 'string' },
        { name: 'senderName', title: 'Sender Name', type: 'string' }
      ]
    },
    {
      name: 'tracking',
      title: 'Tracking Pixel',
      type: 'object',
      group: 'analytics',
      options: { collapsible: true, collapsed: true },
      fields: [
        { name: 'metaPixelId', title: 'Meta Pixel ID', type: 'string' },
        { name: 'gtagId', title: 'Google Tag (gtag.js) ID', type: 'string' },
        { name: 'utmSource', title: 'UTM Source', type: 'string' }
      ]
    },
    {
      name: 'stats',
      title: 'Stats Cache',
      type: 'object',
      group: 'operations',
      fields: [
        {
          name: 'soldCount',
          title: 'Sold Count',
          type: 'number',
          readOnly: true,
          description: 'Auto-updated via webhook to show live tracker counts.'
        }
      ]
    },
    {
      name: 'meta',
      title: 'Meta Overrides',
      type: 'object',
      group: 'seo',
      options: { collapsible: true, collapsed: true },
      fields: [
        { name: 'title', title: 'Meta Title', type: 'string' },
        { name: 'description', title: 'Meta Description', type: 'text', rows: 3 },
        { name: 'ogImage', title: 'OG Image', type: 'image', options: { hotspot: true } }
      ]
    },
    {
      name: 'seo',
      title: 'SEO Fields',
      type: 'object',
      group: 'seo',
      options: { collapsible: true, collapsed: true },
      fields: [
        { name: 'title', title: 'SEO Title', type: 'string' },
        { name: 'description', title: 'SEO Description', type: 'text', rows: 3 },
        { name: 'ogImage', title: 'SEO OG Image', type: 'image', options: { hotspot: true } }
      ]
    }
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug.current',
      media: 'hero.image'
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || 'Sale',
        subtitle: subtitle ? `/${subtitle}` : 'Missing slug',
        media
      }
    }
  }
}
