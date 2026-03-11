require('dotenv').config();

let cachedApp = null;

const getApp = () => {
  if (!cachedApp) {
    // Lazily require the heavy app so boot failures can be surfaced as JSON.
    const { createApiApp } = require('./index');
    cachedApp = createApiApp();
  }
  return cachedApp;
};

const handler = async (req, res) => {
  try {
    const app = getApp();
    return app(req, res);
  } catch (error) {
    console.error('[backend/api/server] boot failure', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        error: 'api-boot-failed',
        message: error?.message || 'unknown-error',
      }));
    }
    return undefined;
  }
};

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  const app = getApp();
  app.listen(PORT, () => {
    console.log(`backend server listening on ${PORT}`);
  });
}

module.exports = handler;
