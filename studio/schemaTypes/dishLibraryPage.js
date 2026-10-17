// Page copy for /dishes. The dishes themselves are NOT here: dish text and dish facts live in the
// hub dish library (Prisma Dish) and are published from there. Everything below is optional; the
// page shows only what is filled in.
export default {
  name: 'dishLibraryPage',
  title: 'Dishes Page',
  type: 'document',
  description: 'Heading, introduction and links shown above the public dish list at /dishes. To add or hide a dish, use the Menu Library tab in the hub.',
  fields: [
    {name: 'title', title: 'Page heading', type: 'string'},
    {name: 'metaDescription', title: 'Search description', type: 'text', rows: 3},
    {name: 'introduction', title: 'Introduction', type: 'text', rows: 4},
    {name: 'emptyNotice', title: 'Shown while no dish is public', type: 'text', rows: 2},
    {name: 'bookLabel', title: 'Link label: book an event', type: 'string'},
    {name: 'weeklyMealsLabel', title: 'Link label: weekly meals', type: 'string'},
  ],
}
