const handler = require('../api-handlers/crowdfund/pizza-feedback');

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
  // Mock getFirebaseAdmin to return no db by setting env so load uses default; but easier: require the module and call with req.method = 'GET'
  const req = { method: 'GET', query: {} };
  const res = makeRes();
  try {
    await handler(req, res);
    console.log('GET response:', res.statusCode, res.body);
  } catch (err) {
    console.error('GET handler threw:', err);
  }

  const req2 = { method: 'POST', body: { name: 'Tester', rating: 5, message: 'Great pizza' } };
  const res2 = makeRes();
  try {
    await handler(req2, res2);
    console.log('POST response:', res2.statusCode, res2.body);
  } catch (err) {
    console.error('POST handler threw:', err);
  }
})();