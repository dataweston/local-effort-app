import { describe, expect, it, vi } from 'vitest';
import sourceCorpusModule from '../sourceCorpus';

const { readSourceDocument, writeSourceDocument } = sourceCorpusModule;

function memoryPrisma(existing = null) {
  let persisted = existing;
  const selectFields = (row, select) => {
    if (!row || !select) return row;
    return Object.fromEntries(
      Object.keys(select)
        .filter((field) => select[field] && Object.hasOwn(row, field))
        .map((field) => [field, row[field]])
    );
  };
  const prisma = {
    brainSourceDocument: {
      findUnique: vi.fn().mockImplementation(async ({ select }) => selectFields(persisted, select)),
      upsert: vi.fn(),
    },
  };
  prisma.brainSourceDocument.upsert.mockImplementation(async ({ create, select }) => {
    persisted = {
      id: 'source-1',
      capturedAt: new Date('2026-03-30T00:00:00.000Z'),
      updatedAt: new Date('2026-03-30T00:00:00.000Z'),
      ...create,
    };
    return selectFields(persisted, select);
  });
  prisma.persisted = () => persisted;
  return prisma;
}

describe('Company Brain source corpus', () => {
  it('round-trips the exact source bytes and verifies their hash', async () => {
    const raw = Buffer.from('From: vendor@example.test\r\nSubject: Exact bytes\r\n\r\n$1,444\r\n', 'utf8');
    const writer = memoryPrisma();
    const stored = await writeSourceDocument({
      source: 'gmail',
      sourceId: 'message-1',
      mediaType: 'message/rfc822',
      rawContent: raw,
      textContent: '$1,444',
      occurredAt: '2026-03-30T00:00:00.000Z',
      prismaClient: writer,
    });

    expect(stored.rawEncoding).toBe('gzip');
    expect(stored.rawByteLength).toBe(raw.length);
    expect(stored).not.toHaveProperty('rawContent');

    const reader = memoryPrisma(writer.persisted());
    const result = await readSourceDocument({
      source: 'gmail',
      sourceId: 'message-1',
      includeRaw: true,
      prismaClient: reader,
    });

    expect(Buffer.from(result.rawBase64, 'base64').equals(raw)).toBe(true);
    expect(result).not.toHaveProperty('rawContent');
  });

  it('fails closed when stored source bytes do not match their content hash', async () => {
    const writer = memoryPrisma();
    const stored = await writeSourceDocument({
      source: 'gmail',
      sourceId: 'message-2',
      mediaType: 'message/rfc822',
      rawContent: Buffer.from('original'),
      prismaClient: writer,
    });
    const reader = memoryPrisma({ ...writer.persisted(), contentHash: '0'.repeat(64) });

    await expect(readSourceDocument({
      id: stored.id,
      includeRaw: true,
      prismaClient: reader,
    })).rejects.toThrow('source document integrity check failed');
  });

  it('does not recompress an unchanged source at the same extraction version', async () => {
    const raw = Buffer.from('immutable source');
    const initialWriter = memoryPrisma();
    const existing = await writeSourceDocument({
      source: 'gmail',
      sourceId: 'message-3',
      mediaType: 'message/rfc822',
      rawContent: raw,
      extractionVersion: 2,
      prismaClient: initialWriter,
    });
    const repeatWriter = memoryPrisma(initialWriter.persisted());

    const repeated = await writeSourceDocument({
      source: 'gmail',
      sourceId: 'message-3',
      mediaType: 'message/rfc822',
      rawContent: raw,
      extractionVersion: 2,
      prismaClient: repeatWriter,
    });

    expect(repeated._existing).toBe(true);
    expect(repeatWriter.brainSourceDocument.upsert).not.toHaveBeenCalled();
  });
});
