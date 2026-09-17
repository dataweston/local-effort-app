'use strict';

const crypto = require('crypto');
const { simpleParser } = require('mailparser');

const SEARCHABLE_ATTACHMENT = /^(?:text\/|application\/(?:json|(?:[^;+.]+\+)?json|xml|(?:[^;+.]+\+)?xml|csv|javascript|x-httpd-php))/i;

function decodeBase64Url(value) {
  if (!value) return Buffer.alloc(0);
  try {
    return Buffer.from(String(value), 'base64url');
  } catch {
    return Buffer.alloc(0);
  }
}

function plainText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function headerMap(headers) {
  const out = {};
  for (const header of headers || []) {
    const key = String(header?.name || header?.key || '').toLowerCase();
    if (!key) continue;
    const value = String(header?.value ?? header?.line ?? '');
    out[key] = out[key] ? `${out[key]}\n${value}` : value;
  }
  return out;
}

function parseMailbox(value) {
  const raw = String(value || '');
  const address = (raw.match(/<([^>]+)>/)?.[1] || raw.match(/[\w.+-]+@[\w.-]+/)?.[0] || '').toLowerCase();
  const name = raw.replace(/<[^>]+>/g, '').replace(address, '').replace(/^['"]|['"]$/g, '').trim();
  return { name: name || null, address: address || null, domain: address.split('@')[1] || null };
}

function addressValues(addressObject) {
  return (addressObject?.value || []).map((entry) => ({
    name: entry.name || null,
    address: entry.address ? String(entry.address).toLowerCase() : null,
  }));
}

function attachmentText(attachment) {
  const contentType = String(attachment.contentType || '').toLowerCase();
  if (!SEARCHABLE_ATTACHMENT.test(contentType)) return null;
  try {
    return Buffer.from(attachment.content || []).toString('utf8');
  } catch {
    return null;
  }
}

/** Parse an exact RFC 2822 message returned by Gmail format=raw. */
async function parseGmailRawMessage(message) {
  const rawContent = decodeBase64Url(message?.raw);
  if (!rawContent.length) throw new Error(`Gmail message ${message?.id || '(unknown)'} has no raw content`);

  try {
    const parsed = await simpleParser(rawContent, { skipImageLinks: true, skipTextToHtml: true });
    const extractedAttachmentTexts = [];
    const extractionGaps = [];
    const attachments = (parsed.attachments || []).map((attachment, index) => {
      const content = Buffer.from(attachment.content || []);
      const text = attachmentText(attachment);
      if (text !== null) {
        extractedAttachmentTexts.push(`Attachment ${index + 1}: ${attachment.filename || 'attachment'}\n${text}`);
      } else {
        extractionGaps.push({
          attachment: attachment.filename || `attachment-${index + 1}`,
          mediaType: attachment.contentType || 'application/octet-stream',
          reason: 'binary attachment preserved in raw message but not text-extracted',
        });
      }
      return {
        index,
        filename: attachment.filename || null,
        mediaType: attachment.contentType || 'application/octet-stream',
        contentDisposition: attachment.contentDisposition || null,
        contentId: attachment.cid || null,
        related: Boolean(attachment.related),
        size: content.length,
        contentHash: crypto.createHash('sha256').update(content).digest('hex'),
        textExtracted: text !== null,
      };
    });

    const htmlContent = typeof parsed.html === 'string' ? parsed.html : null;
    const messageText = String(parsed.text || (htmlContent ? plainText(htmlContent) : '') || '');
    const textContent = [messageText, ...extractedAttachmentTexts].filter(Boolean).join('\n\n');
    const occurredAt = parsed.date && !Number.isNaN(parsed.date.valueOf())
      ? parsed.date
      : (message?.internalDate && Number.isFinite(Number(message.internalDate))
        ? new Date(Number(message.internalDate))
        : new Date());

    return {
      rawContent,
      occurredAt,
      title: parsed.subject || '(no subject)',
      textContent,
      htmlContent,
      headers: (parsed.headerLines || []).map((entry) => ({
        key: entry.key || null,
        line: entry.line || '',
      })),
      attachments,
      captureStatus: 'complete',
      extractionStatus: extractionGaps.length ? 'partial' : 'complete',
      extractionGaps,
      metadata: {
        gmailMessageId: message.id || null,
        gmailThreadId: message.threadId || null,
        gmailHistoryId: message.historyId || null,
        gmailLabelIds: message.labelIds || [],
        gmailSizeEstimate: Number(message.sizeEstimate || rawContent.length),
        rfcMessageId: parsed.messageId || null,
        inReplyTo: parsed.inReplyTo || null,
        references: Array.isArray(parsed.references) ? parsed.references : (parsed.references ? [parsed.references] : []),
        from: addressValues(parsed.from),
        to: addressValues(parsed.to),
        cc: addressValues(parsed.cc),
        bcc: addressValues(parsed.bcc),
        replyTo: addressValues(parsed.replyTo),
        snippet: message.snippet || null,
      },
    };
  } catch (error) {
    return {
      rawContent,
      occurredAt: message?.internalDate && Number.isFinite(Number(message.internalDate))
        ? new Date(Number(message.internalDate))
        : new Date(),
      title: '(unparsed message)',
      textContent: '',
      htmlContent: null,
      headers: [],
      attachments: [],
      captureStatus: 'complete',
      extractionStatus: 'failed',
      extractionGaps: [{ reason: `MIME parse failed: ${error.message}` }],
      metadata: {
        gmailMessageId: message?.id || null,
        gmailThreadId: message?.threadId || null,
        gmailHistoryId: message?.historyId || null,
        gmailLabelIds: message?.labelIds || [],
        gmailSizeEstimate: Number(message?.sizeEstimate || rawContent.length),
        parseError: error.message,
      },
    };
  }
}

function collectGmailPayloadParts(part, result = { plain: [], html: [], attachments: [] }) {
  if (!part) return result;
  const mediaType = String(part.mimeType || '').toLowerCase();
  const filename = String(part.filename || '').trim();
  if (filename || part.body?.attachmentId) {
    result.attachments.push({
      filename: filename || 'attachment',
      mediaType: mediaType || 'application/octet-stream',
      size: Number(part.body?.size || 0),
      attachmentId: part.body?.attachmentId || null,
    });
  }
  if (part.body?.data && mediaType === 'text/plain') {
    result.plain.push(decodeBase64Url(part.body.data).toString('utf8'));
  }
  if (part.body?.data && mediaType === 'text/html') {
    result.html.push(decodeBase64Url(part.body.data).toString('utf8'));
  }
  for (const child of part.parts || []) collectGmailPayloadParts(child, result);
  return result;
}

/** Parse Gmail format=full payloads used by narrow extraction jobs. */
function parseGmailFullMessage(message) {
  const headers = message?.payload?.headers || [];
  const mappedHeaders = headerMap(headers);
  const parts = collectGmailPayloadParts(message?.payload);
  const htmlContent = parts.html.join('\n');
  return {
    headers,
    headerMap: mappedHeaders,
    title: mappedHeaders.subject || '(no subject)',
    textContent: parts.plain.join('\n').trim() || plainText(htmlContent || message?.snippet || ''),
    htmlContent: htmlContent || null,
    attachments: parts.attachments,
  };
}

module.exports = {
  decodeBase64Url,
  plainText,
  headerMap,
  parseMailbox,
  parseGmailRawMessage,
  parseGmailFullMessage,
};
