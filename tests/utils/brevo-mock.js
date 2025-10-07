// Lightweight Brevo mock using global fetch stubbing so no external test deps are required.

function makeResponse(ok, status, body) {
  return {
    ok: !!ok,
    status: Number(status),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => body,
  };
}

exports.mockBrevoSend = function mockBrevoSend(success = true, status = 201, responseBody = { message: 'sent' }) {
  const original = globalThis.fetch;
  globalThis.__orig_fetch = original;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.toString && input.toString());
    if (url && url.includes('/v3/smtp/email')) {
      return makeResponse(success, status, responseBody);
    }
    if (original) return original(input, init);
    throw new Error('Unexpected fetch call in test: ' + url);
  };
  return () => { globalThis.fetch = globalThis.__orig_fetch; delete globalThis.__orig_fetch; };
};

exports.mockBrevoContacts = function mockBrevoContacts(status = 201, responseBody = {}) {
  const original = globalThis.fetch;
  globalThis.__orig_fetch = original;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.toString && input.toString());
    if (url && url.includes('/v3/contacts')) {
      return makeResponse(true, status, responseBody);
    }
    if (original) return original(input, init);
    throw new Error('Unexpected fetch call in test: ' + url);
  };
  return () => { globalThis.fetch = globalThis.__orig_fetch; delete globalThis.__orig_fetch; };
};

exports.cleanAll = function cleanAll() {
  if (globalThis.__orig_fetch) {
    globalThis.fetch = globalThis.__orig_fetch;
    delete globalThis.__orig_fetch;
  }
};

module.exports = exports;
