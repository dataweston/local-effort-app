import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// require the JS mock util
const { mockBrevoSend, cleanAll } = require('../utils/brevo-mock.js');

// Import the module under test
import * as brevo from '../../apps/api/src/brevo';

describe('sendOrderEmail', () => {
  beforeEach(() => {
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_TEMPLATE_ID = '1234';
  });
  afterEach(() => {
    cleanAll();
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_TEMPLATE_ID;
  });

  it('skips when env missing', async () => {
    delete process.env.BREVO_API_KEY;
    const res = await brevo.sendOrderEmail({ order: { email: 'a@b.com', n: 'Alice', oid: 'OID', jti: 'jti', expires_at: 'soon' } as any, jwt: 'jwt', qrUrl: 'http://qr' });
    expect(res.skipped).toBe(true);
  });

  it('posts payload to Brevo when configured', async () => {
    const scope = mockBrevoSend(true, 201, { message: 'ok' });
    const res = await brevo.sendOrderEmail({ order: { email: 'a@b.com', n: 'Alice Jones', oid: 'OID', jti: 'jti', expires_at: 'soon' } as any, jwt: 'jwt', qrUrl: 'http://qr' });
    expect(res.skipped).toBe(false);
    expect(scope.isDone()).toBe(true);
  });

  it('throws on non-ok response', async () => {
    mockBrevoSend(false);
    await expect(
      brevo.sendOrderEmail({ order: { email: 'a@b.com', n: 'Bob', oid: 'OID', jti: 'jti', expires_at: 'soon' } as any, jwt: 'jwt', qrUrl: 'http://qr' })
    ).rejects.toThrow(/Brevo send failed/);
  });
});
