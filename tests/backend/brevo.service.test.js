const { describe, it, beforeEach, afterEach } = require('vitest');
const { mockBrevoSend, mockBrevoContacts, cleanAll } = require('../../utils/brevo-mock.js');

const path = require('path');

describe('backend Brevo service', () => {
  let createBrevoService;
  beforeEach(() => {
    process.env.BREVO_API_KEY = 'test-key';
    // require fresh
    delete require.cache[require.resolve(path.resolve(__dirname, '../../../backend/api/services/brevo.js'))];
    createBrevoService = require(path.resolve(__dirname, '../../../backend/api/services/brevo.js')).createBrevoService;
  });
  afterEach(() => {
    cleanAll();
    delete process.env.BREVO_API_KEY;
  });

  it('sendEmail posts to Brevo', async () => {
    const svc = createBrevoService({});
    const scope = mockBrevoSend(true, 201, { message: 'ok' });
    await svc.sendEmail({ to: [{ email: 'x@y.com' }], sender: { email: 'from@y.com' }, subject: 'hi', htmlContent: '<p>ok</p>' });
    if (!scope.isDone()) throw new Error('brevo send not called');
  });

  it('upsertContact posts to contacts endpoint', async () => {
    const svc = createBrevoService({});
    const scope = mockBrevoContacts(201, {});
    await svc.upsertContact({ email: 'a@b.com', firstName: 'A', lastName: 'B', phone: '555' });
    if (!scope.isDone()) throw new Error('contacts endpoint not called');
  });
});
