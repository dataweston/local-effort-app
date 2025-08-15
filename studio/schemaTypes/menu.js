// schemas/menu.js

export default {
  name: 'menu',
  title: 'Sample Menu',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Menu Title',
      type: 'string',
      description: 'e.g., "A Late Summer Dinner"',
    },
    {
      name: 'description',
      title: 'Description',
      type: 'string',
      description: 'A short description of the menu or event.',
    },
    {
      name: 'sections',
      title: 'Menu Sections',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'menuSection' }] }],
    },
  ],
}
