export function ptToHtml(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return '';
  }

  try {
    const lines = blocks
      .map((block) => {
        if (!block || block._type !== 'block' || !Array.isArray(block.children)) {
          return '';
        }
        const text = block.children
          .map((child) => (child && typeof child.text === 'string' ? child.text : ''))
          .join('')
          .trim();
        return text;
      })
      .filter(Boolean);

    return lines.join('\n\n');
  } catch (error) {
    return '';
  }
}
