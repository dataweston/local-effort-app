export default {
  name: 'contact',
  type: 'document',
  title: 'Contact',
  fields: [
    { name: 'email', type: 'string', title: 'Email' },
    { name: 'firstName', type: 'string', title: 'First name' },
    { name: 'lastName', type: 'string', title: 'Last name' },
    { name: 'phone', type: 'string', title: 'Phone' },
    { name: 'tags', type: 'array', of: [{ type: 'string' }], title: 'Tags' },
    { name: 'updatedAt', type: 'datetime', title: 'Updated at' },
  ],
}
