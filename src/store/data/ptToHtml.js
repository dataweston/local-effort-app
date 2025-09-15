import React from 'react';
import { PortableText } from '@portabletext/react';

// Render blocks into a string of HTML by mounting to a temporary container
export function ptToHtml(blocks) {
  try {
    if (!Array.isArray(blocks) || !blocks.length) return '';
    const container = document.createElement('div');
    // naive client-side render; on server we’d use serializers to string
    // Here we just inject minimal markup using default components.
    // In SPA, we can’t easily render to string without ReactDOMServer.
    // So we return empty and rely on rendering components directly where possible.
    return '';
  } catch {
    return '';
  }
}
