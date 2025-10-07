// Lightweight Brevo mock using global fetch stubbing so no external test deps are required.

function makeResponse(ok, status, body) {
  return {
    ok: !!ok,
    status: Number(status),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => body,
  };
}

export function mockBrevoSend(success = true, status = 201, responseBody = { message: 'sent' }) {
  const original = (globalThis as any).fetch;
  (globalThis as any).__orig_fetch = original;
  (globalThis as any).fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.toString && input.toString());
    if (url && url.includes('/v3/smtp/email')) {
      return makeResponse(success, status, responseBody);
    }
    if (original) return original(input, init);
    throw new Error('Unexpected fetch call in test: ' + url);
  };
  return () => { (globalThis as any).fetch = (globalThis as any).__orig_fetch; delete (globalThis as any).__orig_fetch; };
}

export function mockBrevoContacts(status = 201, responseBody = {}) {
  const original = (globalThis as any).fetch;
  (globalThis as any).__orig_fetch = original;
  (globalThis as any).fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.toString && input.toString());
    if (url && url.includes('/v3/contacts')) {
      return makeResponse(true, status, responseBody);
    }
    if (original) return original(input, init);
    throw new Error('Unexpected fetch call in test: ' + url);
  };
  return () => { (globalThis as any).fetch = (globalThis as any).__orig_fetch; delete (globalThis as any).__orig_fetch; };
}

export function cleanAll() {
  if ((globalThis as any).__orig_fetch) {
    (globalThis as any).fetch = (globalThis as any).__orig_fetch;
    delete (globalThis as any).__orig_fetch;
  }
}

export default { mockBrevoSend, mockBrevoContacts, cleanAll };
