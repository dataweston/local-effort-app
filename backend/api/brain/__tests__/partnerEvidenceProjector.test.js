import { describe, expect, it } from 'vitest';
import projector from '../partnerEvidenceProjector';

const vendors = [
  { id: 'bakers', name: "Bakers' Field Flour & Bread", aliases: [{ alias: 'Bakers Field' }] },
  { id: 'hope', name: 'Hope Butter', aliases: [] },
];

describe('partner evidence projector', () => {
  it('resolves canonical names and aliases without substring false positives', () => {
    const found = projector.findVendorMentions("We use Bakers Field flour and Hope Butter. Don't match hopeless.", vendors);
    expect(found.map((item) => item.vendorId)).toEqual(['bakers', 'hope']);
  });

  it('normalizes Composio-style Instagram exports into vendor evidence', () => {
    const evidence = projector.scanInstagramExport({ data: [{ id: 'ig-1', caption: { text: 'Pie with Hope Butter.' }, permalink: 'https://instagram.test/p/1', timestamp: '2026-01-02T00:00:00Z' }] }, vendors);
    expect(evidence).toMatchObject([{ kind: 'instagram', vendorId: 'hope', sourceLocator: 'ig-1', publiclyVisible: true }]);
    expect(evidence[0].sourceUrl).toBe('https://instagram.test/p/1');
  });

  it('produces stable idempotency keys and changes them when evidence changes', () => {
    const base = { kind: 'repository', sourceLocator: 'src/x.jsx:4', vendorId: 'hope', excerpt: 'Hope Butter' };
    expect(projector.evidenceKey(base)).toBe(projector.evidenceKey({ ...base }));
    expect(projector.evidenceKey(base)).not.toBe(projector.evidenceKey({ ...base, excerpt: 'Hope Butter in pie' }));
  });

  it('derives a stable fallback id for posts without provider ids', () => {
    const first = projector.normalizeInstagramPost({ caption: 'Hope Butter', permalink: 'https://instagram.test/p/x' });
    const second = projector.normalizeInstagramPost({ caption: 'Hope Butter', permalink: 'https://instagram.test/p/x' });
    expect(first.id).toBe(second.id);
  });
});
