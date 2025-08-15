// schemas/menuSection.js

export default {
  name: 'menuSection',
  title: 'Menu Section',
  type: 'document',
  fields: [
    {
      name: 'course',
      title: 'Course',
      type: 'string',
      description: 'e.g., Appetizers, Main Course, Dessert',
    },
    {
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'List of dishes in this section.',
    },
  ],
}
