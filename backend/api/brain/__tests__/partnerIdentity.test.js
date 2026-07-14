import { describe, expect, it } from 'vitest';
import partnerReview from '../partnerReviewRoutes';

const { normalizeVendorIdentity, identitySimilarity, vendorCluster } = partnerReview;

describe('partner identity triage', () => {
  it('groups Facebook charge descriptors without equating unrelated vendors', () => {
    expect(vendorCluster({ name: 'FACEBK ZKEKTWC3Q2', aliases: [] }).key).toBe('meta');
    expect(identitySimilarity('FACEBK ZKEKTWC3Q2', 'FACEBK SZNACTGN22')).toBeLessThan(0.95);
  });

  it('does not classify T-Mobile as fuel', () => {
    expect(vendorCluster({ name: 'T Mobile Web Payment', aliases: [] }).key).not.toBe('fuel');
    expect(vendorCluster({ name: 'Mobil', aliases: [] }).key).toBe('fuel');
  });

  it('normalizes common transaction descriptor noise', () => {
    expect(normalizeVendorIdentity('Holiday Stations 0343 POS Purchase')).toBe('holiday stations');
  });
});
