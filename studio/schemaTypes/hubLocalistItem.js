const HUB_SALES_AREA_OPTIONS = [
  { title: 'Localist', value: 'localist' },
  { title: 'Security at Neon', value: 'security' },
]

export default {
  name: 'hubLocalistItem',
  title: 'Localist Menu Item',
  type: 'document',
  fieldsets: [
    {
      name: 'dietaryFlags',
      title: 'Dietary and allergen flags',
      options: { columns: 2 },
    },
  ],
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    },
    {
      name: 'price',
      title: 'Price',
      type: 'string',
      description: 'Display price, e.g. "$28" or "Market price".',
    },
    {
      name: 'priceCents',
      title: 'Checkout price in cents',
      type: 'number',
      description: 'Exact Square checkout price, e.g. 1200 for $12. Leave blank only when the display price is a simple dollar amount.',
      validation: (Rule) => Rule.min(1).integer(),
    },
    {
      name: 'inventoryCount',
      title: 'Inventory count',
      type: 'number',
      description: 'Optional number available for this menu item. Set to 0 to mark the item sold out.',
      validation: (Rule) => Rule.min(0).integer(),
    },
    {
      name: 'areas',
      title: 'Hub sales areas',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: HUB_SALES_AREA_OPTIONS,
        layout: 'grid',
      },
      description: 'Choose where this item appears on Hub sales pages. Existing blank items still appear on Localist.',
      initialValue: ['localist'],
      validation: (Rule) => Rule.unique(),
    },
    {
      name: 'glutenFree',
      title: 'Gluten free',
      type: 'boolean',
      fieldset: 'dietaryFlags',
      initialValue: false,
    },
    {
      name: 'dairyFree',
      title: 'Dairy free',
      type: 'boolean',
      fieldset: 'dietaryFlags',
      initialValue: false,
    },
    {
      name: 'containsPork',
      title: 'Contains pork',
      type: 'boolean',
      fieldset: 'dietaryFlags',
      initialValue: false,
    },
    {
      name: 'containsNuts',
      title: 'Contains nuts',
      type: 'boolean',
      fieldset: 'dietaryFlags',
      initialValue: false,
    },
    {
      name: 'containsDairy',
      title: 'Contains dairy',
      type: 'boolean',
      fieldset: 'dietaryFlags',
      initialValue: false,
    },
    {
      name: 'order',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers appear first.',
      initialValue: 0,
    },
    {
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Uncheck to hide this item from the order form.',
      initialValue: true,
    },
  ],
  orderings: [
    {
      title: 'Sort order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'price', active: 'active', areas: 'areas' },
    prepare({ title, subtitle, active, areas }) {
      const areaLabels = (areas || [])
        .map((area) => HUB_SALES_AREA_OPTIONS.find((option) => option.value === area)?.title || area)
        .join(', ')
      return {
        title: title || 'Untitled item',
        subtitle: [subtitle, areaLabels, active === false ? '(hidden)' : null].filter(Boolean).join(' / '),
      }
    },
  },
}
