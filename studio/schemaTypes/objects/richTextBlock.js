const linkAnnotation = {
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
}

export function richTextBlock() {
  return {
    type: 'block',
    marks: {
      decorators: [
        { title: 'Bold', value: 'strong' },
        { title: 'Italic', value: 'em' },
      ],
      annotations: [linkAnnotation],
    },
  }
}

// Body copy for storefront pages: paragraphs, Shift+Enter line breaks, bold,
// italic, underline, links and simple lists. Headings are separate fields on
// the page, so there are no heading styles to pick from.
export function pageRichText() {
  return {
    type: 'block',
    styles: [{ title: 'Normal', value: 'normal' }],
    lists: [
      { title: 'Bulleted list', value: 'bullet' },
      { title: 'Numbered list', value: 'number' },
    ],
    marks: {
      decorators: [
        { title: 'Bold', value: 'strong' },
        { title: 'Italic', value: 'em' },
        { title: 'Underline', value: 'underline' },
      ],
      annotations: [linkAnnotation],
    },
  }
}
