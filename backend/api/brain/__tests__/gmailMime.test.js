import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import gmailMimeModule from '../gmailMime';

const { parseGmailRawMessage } = gmailMimeModule;

function base64Url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

describe('Gmail RFC 2822 extraction', () => {
  it('preserves exact MIME bytes while surfacing searchable and binary attachments', async () => {
    const binary = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]);
    const raw = Buffer.from([
      'From: Vendor <vendor@example.test>',
      'To: owner@example.test',
      'Subject: Tyler service adjustment',
      'Message-ID: <tyler-adjustment@example.test>',
      'Date: Mon, 30 Mar 2026 12:00:00 -0400',
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="brain-boundary"',
      '',
      '--brain-boundary',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      'Three weeks are $1,088 after one prior undelivered-service credit.',
      '--brain-boundary',
      'Content-Type: text/csv; name="rates.csv"',
      'Content-Disposition: attachment; filename="rates.csv"',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from('period,amount\nfour weeks,1444\nannual membership,375\n').toString('base64'),
      '--brain-boundary',
      'Content-Type: application/pdf; name="agreement.pdf"',
      'Content-Disposition: attachment; filename="agreement.pdf"',
      'Content-Transfer-Encoding: base64',
      '',
      binary.toString('base64'),
      '--brain-boundary--',
      '',
    ].join('\r\n'), 'utf8');

    const parsed = await parseGmailRawMessage({
      id: 'gmail-message-1',
      threadId: 'gmail-thread-1',
      historyId: '1234567890123456789',
      raw: base64Url(raw),
      sizeEstimate: raw.length,
      labelIds: ['SENT'],
    });

    expect(parsed.rawContent.equals(raw)).toBe(true);
    expect(parsed.captureStatus).toBe('complete');
    expect(parsed.extractionStatus).toBe('partial');
    expect(parsed.title).toBe('Tyler service adjustment');
    expect(parsed.textContent).toContain('Three weeks are $1,088');
    expect(parsed.textContent).toContain('four weeks,1444');
    expect(parsed.textContent).toContain('annual membership,375');
    expect(parsed.attachments).toHaveLength(2);
    expect(parsed.attachments[0]).toMatchObject({
      filename: 'rates.csv',
      mediaType: 'text/csv',
      textExtracted: true,
    });
    expect(parsed.attachments[1]).toMatchObject({
      filename: 'agreement.pdf',
      mediaType: 'application/pdf',
      size: binary.length,
      contentHash: crypto.createHash('sha256').update(binary).digest('hex'),
      textExtracted: false,
    });
    expect(parsed.extractionGaps).toEqual([
      expect.objectContaining({
        attachment: 'agreement.pdf',
        reason: 'binary attachment preserved in raw message but not text-extracted',
      }),
    ]);
    expect(parsed.metadata).toMatchObject({
      gmailMessageId: 'gmail-message-1',
      gmailThreadId: 'gmail-thread-1',
      gmailHistoryId: '1234567890123456789',
      rfcMessageId: '<tyler-adjustment@example.test>',
    });
  });
});
