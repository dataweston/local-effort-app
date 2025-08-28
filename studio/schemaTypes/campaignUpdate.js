// schemas/campaignUpdate.js
export default {
    name: 'campaignUpdate',
    title: 'Campaign Update',
    type: 'document',
    fields: [
        {
            name: 'title',
            title: 'Update Title',
            type: 'string',
        },
        {
            name: 'publishedAt',
            title: 'Published At',
            type: 'datetime',
        },
        {
            name: 'body',
            title: 'Update Body',
            type: 'array',
            of: [{ type: 'block' }],
        },
    ]
}