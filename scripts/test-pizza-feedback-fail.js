// Simulate Firestore unavailable by monkey-patching the helper
const path = require('path');
const modPath = path.resolve(__dirname, '../api-handlers/crowdfund/pizza-feedback.js');

// require the original, but we will monkey-patch the firebase helper it imports
const proxyquire = require('proxyquire').noCallThru();

const fakeGetFirebaseAdmin = () => ({ firestore: null });

const handler = proxyquire(modPath, {
  '../_lib/firebaseAdmin': { getFirebaseAdmin: fakeGetFirebaseAdmin },
});

const makeRes = () => {
  const res = {};
  res.headers = {};
  res.statusCode = 200;
  res.body = null;
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
};

(async () => {
  const req = { method: 'GET', query: {} };
  const res = makeRes();
  try {
    await handler(req, res);
    console.log('GET simulated response:', res.statusCode, res.body);
  } catch (err) {
    console.error('GET threw:', String(err));
  }

  const req2 = { method: 'POST', body: { name: 'Tester', rating: 5, message: 'Great pizza' } };
  const res2 = makeRes();
  try {
    await handler(req2, res2);
    console.log('POST simulated response:', res2.statusCode, res2.body);
  } catch (err) {
    console.error('POST threw:', String(err));
  }
})();