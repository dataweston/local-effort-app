export default {
  // This is the unique name for this schema in the backend
  name: 'menuItems',
  
  // This is the human-readable title that will appear in the Studio
  title: 'Menu Items',
  
  // This defines it as a document type
  type: 'document',
  
  // These are the fields for each menu item
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'The name of the food item (e.g., Sourdough Loaf).',
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      description: 'A brief description that will appear on the card and in the modal.',
    },
    {
      name: 'ingredients',
      title: 'Ingredients',
      type: 'array',
      // This specifies that it's an array of strings
      of: [{type: 'string'}],
      description: 'List of ingredients for this item.',
    },
  ],
}