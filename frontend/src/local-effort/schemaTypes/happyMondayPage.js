export default {
  name: 'happyMondayPage',
  title: 'Happy Monday Page',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Page Title',
      type: 'string',
      description: 'The main heading for the page (e.g., "Happy Monday Menu").',
    },
    {
      name: 'body',
      title: 'Content Box',
      type: 'array',
      // This 'block' type enables the rich text editor
      of: [{ type: 'block' }],
      description: 'The main content that appears above the menu items.',
    },
  ],
}