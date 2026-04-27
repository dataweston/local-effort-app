require('dotenv').config();

const {
  closeNeo4jDriver,
  resolveNeo4jConfig,
  verifyNeo4jConnection,
} = require('../backend/api/utils/neo4j');

async function main() {
  const config = resolveNeo4jConfig();
  const summary = {
    uri: config.uri,
    username: config.username,
    database: config.database,
  };

  if (!summary.uri || !summary.username || !config.password) {
    throw new Error('Neo4j env vars missing. Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, and NEO4J_DATABASE.');
  }

  const result = await verifyNeo4jConnection();
  console.log(JSON.stringify({
    config: summary,
    connection: result,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('[brain-neo4j-test] failed:', error && error.message ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeNeo4jDriver();
  });
