import PriceUsdInput from '../../components/PriceUsdInput.jsx'

export default {
  name: 'saleProduct',
  title: 'Sale Product',
  type: 'object',
  fields: [
    {
      name: 'product',
      title: 'Product',
      type: 'reference',
      to: [{ type: 'product' }],
      validation: (Rule) => Rule.required()
    },
    {
      name: 'order',
      title: 'Display Order',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.min(0)
    },
    {
      name: 'hide',
      title: 'Hide Product',
      type: 'boolean',
      initialValue: false
    },
    {
      name: 'badge',
      title: 'Badge',
      type: 'string',
      description: 'Short label shown on the product card (e.g., New, Limited).'
    },
    {
      name: 'priceOverride',
      title: 'Override Price (USD)',
      type: 'number',
      components: { input: PriceUsdInput },
      description: 'Optional price override in USD for this sale.'
    },
    {
      name: 'limitPerCustomer',
      title: 'Limit Per Customer',
      type: 'number',
      validation: (Rule) => Rule.min(1),
      description: 'Leave blank for no limit.'
    },
    {
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 3,
      description: 'Optional copy shown under the product card.'
    }
  ],
  preview: {
    select: {
      title: 'product.title',
      subtitle: 'badge'
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Untitled product',
        subtitle: subtitle ? `Badge: ${subtitle}` : undefined
      }
    }
  }
}
