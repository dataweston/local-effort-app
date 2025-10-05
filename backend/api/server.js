const { createApiApp } = require('./index');

const app = createApiApp();
const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`backend server listening on ${PORT}`);
  });
}

module.exports = app;
