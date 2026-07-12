import PriceUsdInput from '../components/PriceUsdInput.jsx'
import { richTextBlock } from './objects/richTextBlock'

export default {
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 } },
    { name: 'shortDescription', title: 'Short Description', type: 'string' },
    { name: 'longDescription', title: 'Long Description', type: 'array', of: [richTextBlock()] },
    { name: 'images', title: 'Images', type: 'array', of: [{ type: 'image' }], options: { layout: 'grid' } },
    { name: 'price', title: 'Price (USD)', description: 'Enter dollars (USD).', type: 'number', components: { input: PriceUsdInput }, validation: (Rule) => Rule.min(0) },
    { name: 'salePrice', title: 'Sale Price (USD)', description: 'Optional sale price in dollars (USD).', type: 'number', components: { input: PriceUsdInput } },
    { name: 'priceDisplay', title: 'Price Display Override', type: 'string', description: 'Optional text shown instead of formatted price (e.g., "$8 pre-order").' },
    { name: 'currency', title: 'Currency', type: 'string', initialValue: 'USD', readOnly: true },
    { name: 'squareItemId', title: 'Square Item ID', type: 'string' },
    { name: 'squareVariationId', title: 'Square Variation ID', type: 'string' },
    {
      name: 'stores',
      title: 'Display on Store Pages',
      type: 'array',
      description: 'Select which store page(s) this product should appear on. You can select multiple stores.',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Main Store (/sale)', value: 'sale' },
          { title: 'Chez Garage (/chez-garage)', value: 'chez-garage' },
          { title: 'Happy Monday (/happy-monday)', value: 'happy-monday' },
          { title: 'Tiny Diner (/tiny-diner)', value: 'tiny-diner' }
        ],
        layout: 'checkbox'
      },
      validation: (Rule) => Rule.required().min(1).error('Select at least one store page for this product.')
    },
    {
      name: 'addOns',
      title: 'Add-Ons',
      type: 'array',
      description: 'Optional add-ons like pizza toppings, extras, etc. that customers can add for an additional cost.',
      of: [{
        type: 'object',
        fields: [
          { 
            name: 'name', 
            type: 'string', 
            title: 'Add-On Name',
            description: 'e.g., "Extra Cheese", "Pepperoni", "Gluten-Free Crust"',
            validation: (Rule) => Rule.required()
          },
          { 
            name: 'additionalCost', 
            type: 'number', 
            title: 'Additional Cost (USD)', 
            description: 'Extra cost in dollars (USD). Use 0 for free add-ons.',
            components: { input: PriceUsdInput },
            validation: (Rule) => Rule.min(0).required()
          },
          { 
            name: 'squareModifierId', 
            type: 'string', 
            title: 'Square Modifier ID (optional)',
            description: 'If syncing with Square, enter the modifier ID here.'
          },
          {
            name: 'defaultSelected',
            type: 'boolean',
            title: 'Default Selected',
            description: 'Check if this add-on should be pre-selected by default',
            initialValue: false
          },
        ],
        preview: {
          select: {
            name: 'name',
            cost: 'additionalCost'
          },
          prepare({ name, cost }) {
            return {
              title: name || 'Unnamed Add-On',
              subtitle: cost > 0 ? `+$${cost.toFixed(2)}` : 'Free'
            }
          }
        }
      }]
    },
    {
      name: 'offerDairyFree',
      title: 'Offer Dairy-Free Option',
      type: 'boolean',
      description: 'Check this box to show a "Dairy-Free" checkbox option for this product.',
      initialValue: false
    },
    {
      name: 'dairyFreeCost',
      title: 'Dairy-Free Additional Cost (USD)',
      type: 'number',
      description: 'Extra cost for dairy-free option in dollars (USD). Use 0 if same price.',
      components: { input: PriceUsdInput },
      hidden: ({ parent }) => !parent?.offerDairyFree,
      initialValue: 0,
      validation: (Rule) => Rule.min(0)
    },
    {
      name: 'variants',
      title: 'Variants (Legacy - deprecated in favor of Add-Ons)',
      type: 'array',
      description: 'DEPRECATED: Use Add-Ons instead for better flexibility. This field is kept for backward compatibility.',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', type: 'string', title: 'Name' },
          { name: 'squareVariationId', type: 'string', title: 'Square Variation ID' },
          { name: 'price', type: 'number', title: 'Price (USD)', description: 'Enter dollars (USD).', components: { input: PriceUsdInput } },
        ]
      }]
    },
    {
      name: 'squareCheckoutLinkUrl',
      title: 'Square Checkout Link URL',
      type: 'url',
      description: 'Tier A: direct checkout link generated by Square.'
    },
    {
      name: 'inventoryMode',
      title: 'Inventory Mode',
      type: 'string',
      initialValue: 'unmanaged',
      options: {
        list: [
          { title: 'Unmanaged / Infinite', value: 'unmanaged' },
          { title: 'Square Managed', value: 'square' },
          { title: 'Manual (enter quantity)', value: 'manual' }
        ],
        layout: 'radio'
      }
    },
    {
      name: 'manualQty',
      title: 'Manual Inventory Quantity',
      type: 'number',
      hidden: ({ parent }) => parent?.inventoryMode !== 'manual',
      validation: (Rule) => Rule.min(0)
    },
    {
      name: 'lastSyncedAt',
      title: 'Last Synced At',
      type: 'datetime',
      readOnly: true,
      description: 'Timestamp of last sync from Square or other systems.'
    },
    { name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'string' }] },
    { name: 'active', title: 'Active', type: 'boolean', initialValue: true },
    {
      name: 'allowsDelivery',
      title: 'Allow local delivery',
      type: 'boolean',
      description: 'If enabled, customers may choose local delivery at checkout. Leave unchecked to make this item pickup only.',
      initialValue: false,
    },
  ],
  preview: {
    select: { title: 'title', media: 'images.0' },
  },
}
