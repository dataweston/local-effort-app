export function richTextBlock() {
  return {
    type: 'block',
    marks: {
      decorators: [
        { title: 'Bold', value: 'strong' },
        { title: 'Italic', value: 'em' },
      ],
      annotations: [
        {
          name: 'link',
          title: 'Link',
          type: 'object',
          fields: [
            {
              name: 'href',
              title: 'URL',
              type: 'url',
              validation: (Rule) => Rule.uri({
                allowRelative: true,
                scheme: ['http', 'https', 'mailto', 'tel'],
              }),
            },
            {
              name: 'openInNewTab',
              title: 'Open in a new tab',
              type: 'boolean',
              initialValue: false,
            },
          ],
        },
      ],
    },
  }
}
