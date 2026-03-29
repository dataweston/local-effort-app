import { describe, expect, it, vi } from 'vitest';
import {
  createJsonPriorityRepository,
  createPriorityRepository,
  createSanityPriorityRepository,
  mapSanityPriority,
} from '../priorityRepository';

const SAMPLE_PRIORITY = {
  id: 'priority-one',
  label: 'Priority One',
  weight: 0.7,
  active: true,
  strategy: 'orient',
  reasons: ['service-fit'],
  messageFacts: ['Start here first.'],
  match: { pageTypes: ['home'], pathPrefixes: ['/'], acquisitionSources: [] },
};

describe('priority repository', () => {
  it('loads json priorities through the normalized repository contract', async () => {
    const repository = createJsonPriorityRepository({
      loadRegistry: () => [SAMPLE_PRIORITY],
      logger: { info: vi.fn() },
    });

    const result = await repository.listPriorities();

    expect(result.metadata.sourceName).toBe('json');
    expect(result.items[0].sourceName).toBe('json');
    expect(result.items[0].id).toBe('priority-one');
  });

  it('maps sanity documents into registry entries', () => {
    const mapped = mapSanityPriority({
      _id: 'doc-1',
      priorityId: 'priority-two',
      title: 'Priority Two',
      active: true,
      weight: 0.9,
      strategy: 'promote',
      reasons: ['sale-page'],
      messageFacts: ['Use the sale catalog.'],
      ctaLabel: 'Shop',
      ctaHref: '/sale',
      match: { pageTypes: ['sale'], pathPrefixes: ['/sale'], acquisitionSources: ['google'] },
    });

    expect(mapped.id).toBe('priority-two');
    expect(mapped.cta).toEqual({ label: 'Shop', href: '/sale' });
    expect(mapped.match.pathPrefixes).toEqual(['/sale']);
  });

  it('falls back to json when the primary repository is empty', async () => {
    const repository = createPriorityRepository({
      primaryRepository: {
        name: 'sanity',
        listPriorities: vi.fn().mockResolvedValue({
          items: [],
          metadata: { sourceName: 'sanity', fallbackUsed: false, itemCount: 0 },
        }),
      },
      fallbackRepository: {
        name: 'json',
        listPriorities: vi.fn().mockResolvedValue({
          items: [{ ...SAMPLE_PRIORITY, sourceName: 'json' }],
          metadata: { sourceName: 'json', fallbackUsed: false, itemCount: 1 },
        }),
      },
      logger: { warn: vi.fn() },
    });

    const result = await repository.listPriorities();

    expect(result.metadata.sourceName).toBe('json');
    expect(result.metadata.fallbackUsed).toBe(true);
    expect(result.items).toHaveLength(1);
  });

  it('uses sanity when it returns valid priorities', async () => {
    const repository = createSanityPriorityRepository({
      client: {
        fetch: vi.fn().mockResolvedValue([
          {
            _id: 'doc-2',
            priorityId: 'priority-three',
            title: 'Priority Three',
            active: true,
            weight: 0.65,
            strategy: 'reassure',
            reasons: ['repeat-flow'],
            messageFacts: ['Continue quickly.'],
            match: { pageTypes: ['commerce'], pathPrefixes: ['/weekly-order'], acquisitionSources: [] },
          },
        ]),
      },
      logger: { info: vi.fn() },
    });

    const result = await repository.listPriorities();

    expect(result.metadata.sourceName).toBe('sanity');
    expect(result.items[0].id).toBe('priority-three');
    expect(result.items[0].sourceName).toBe('sanity');
  });
});
