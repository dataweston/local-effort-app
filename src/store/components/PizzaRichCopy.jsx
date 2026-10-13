import React from 'react';
import { PortableText } from '@portabletext/react';

// Renders Studio rich text (bold, italic, underline, links, lists, line breaks)
// with the page's own typography. `inline` renders paragraphs as spans so the
// copy can sit inside a <small>, <label> or other phrasing-only element.
// Plain strings (the generated fallback copy) render as-is, honouring newlines.

function Link({ children, value }) {
  const href = typeof value?.href === 'string' ? value.href.trim() : '';
  if (!href) return <>{children}</>;
  const external = value?.openInNewTab === true;
  return (
    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
      {children}
    </a>
  );
}

const marks = {
  link: Link,
  underline: ({ children }) => <u>{children}</u>,
};

const blockComponents = {
  marks,
};

const inlineComponents = {
  marks,
  block: {
    normal: ({ children }) => <span className="ps-rich-line">{children}</span>,
  },
  list: {
    bullet: ({ children }) => <span className="ps-rich-line">{children}</span>,
    number: ({ children }) => <span className="ps-rich-line">{children}</span>,
  },
  listItem: {
    bullet: ({ children }) => <span className="ps-rich-line">• {children}</span>,
    number: ({ children }) => <span className="ps-rich-line">{children}</span>,
  },
};

export const hasRichCopy = (value) =>
  typeof value === 'string' ? value.trim().length > 0 : Array.isArray(value) && value.length > 0;

export default function PizzaRichCopy({ value, inline = false, as: Tag }) {
  if (!hasRichCopy(value)) return null;
  const Wrapper = Tag || (inline ? 'span' : 'div');
  if (typeof value === 'string') {
    const lines = value.split('\n');
    const Line = inline ? 'span' : 'p';
    return (
      <Wrapper className="ps-rich">
        {lines.map((line, index) => (
          <Line key={`${line}-${index}`} className={inline ? 'ps-rich-line' : undefined}>{line}</Line>
        ))}
      </Wrapper>
    );
  }
  return (
    <Wrapper className="ps-rich">
      <PortableText value={value} components={inline ? inlineComponents : blockComponents} />
    </Wrapper>
  );
}
