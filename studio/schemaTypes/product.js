export default {
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 } },
    { name: 'shortDescription', title: 'Short Description', type: 'string' },
    { name: 'longDescription', title: 'Long Description (Portable Text)', type: 'array', of: [{ type: 'block' }] },
    { name: 'images', title: 'Images', type: 'array', of: [{ type: 'image' }], options: { layout: 'grid' } },
    { name: 'price', title: 'Price (cents)', type: 'number', validation: (Rule) => Rule.min(0) },
    { name: 'salePrice', title: 'Sale Price (cents)', type: 'number' },
    { name: 'currency', title: 'Currency', type: 'string', initialValue: 'USD', readOnly: true },
    { name: 'squareItemId', title: 'Square Item ID', type: 'string' },
    { name: 'squareVariationId', title: 'Square Variation ID', type: 'string' },
    {
      name: 'variants',
      title: 'Variants (optional)',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', type: 'string', title: 'Name' },
          { name: 'squareVariationId', type: 'string', title: 'Square Variation ID' },
          { name: 'price', type: 'number', title: 'Price (cents)' },
        ]
      }]
    },
  { name: 'inventoryManaged', title: 'Manage Inventory in Sanity', type: 'boolean', initialValue: false, description: 'If off, inventory comes from Square or is unlimited.' },
  { name: 'inventory', title: 'Inventory Count', type: 'number', hidden: ({ parent }) => !parent?.inventoryManaged },
    { name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'string' }] },
    { name: 'active', title: 'Active', type: 'boolean', initialValue: true },
  ],
  preview: {
    select: { title: 'title', media: 'images.0' },
  },
}
