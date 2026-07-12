// schemas/campaignUpdate.js
import { richTextBlock } from './objects/richTextBlock'
export default {
    name: 'campaignUpdate',
    title: 'Campaign Update',
    type: 'document',
    fields: [
        {
            name: 'title',
            title: 'Update Title',
            type: 'string',
            description: 'Keep it short and descriptive so supporters quickly understand the news.',
            validation: (Rule) =>
                Rule.required()
                    .min(3)
                    .error('Please add a title for the update.'),
        },
        {
            name: 'publishedAt',
            title: 'Published At',
            type: 'datetime',
            description: 'Defaults to the current time—adjust if you are backfilling past updates.',
            initialValue: () => new Date().toISOString(),
            validation: (Rule) =>
                Rule.required()
                    .error('Add a publish date so updates can be ordered correctly.'),
        },
        {
            name: 'body',
            title: 'Update Body',
            type: 'array',
            of: [richTextBlock()],
            validation: (Rule) =>
                Rule.required()
                    .error('Please add some content to the update body.'),
        },
    ],
    preview: {
        select: {
            title: 'title',
            publishedAt: 'publishedAt',
        },
        prepare({ title, publishedAt }) {
            let subtitle = 'Draft';
            if (publishedAt) {
                const date = new Date(publishedAt);
                subtitle = Number.isNaN(date.getTime())
                    ? 'Unscheduled'
                    : date.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                      });
            }
            return {
                title: title || 'Untitled update',
                subtitle,
            };
        },
    },
}
