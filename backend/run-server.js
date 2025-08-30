// Simple runner to start backend with visible console logs for local debugging
const app = require('./api/server.js');
const PORT = process.env.PORT || 3001;
if (!app) {
  console.error('Failed to require backend app');
  process.exit(1);
}
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend API listening on http://localhost:${PORT}`);
});
