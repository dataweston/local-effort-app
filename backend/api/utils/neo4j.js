const neo4j = require('neo4j-driver');

const globalRef = globalThis;

function resolveNeo4jConfig() {
  return {
    uri: process.env.NEO4J_URI || '',
    username: process.env.NEO4J_USERNAME || '',
    password: process.env.NEO4J_PASSWORD || '',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  };
}

function ensureNeo4jConfig() {
  const config = resolveNeo4jConfig();
  const missing = Object.entries(config)
    .filter(([key, value]) => key !== 'database' && !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing Neo4j configuration: ${missing.join(', ')}`);
  }
  return config;
}

function createNeo4jDriver() {
  const { uri, username, password } = ensureNeo4jConfig();
  return neo4j.driver(uri, neo4j.auth.basic(username, password), {
    disableLosslessIntegers: true,
  });
}

function getNeo4jDriver() {
  if (!globalRef.__localEffortNeo4jDriver) {
    globalRef.__localEffortNeo4jDriver = createNeo4jDriver();
  }
  return globalRef.__localEffortNeo4jDriver;
}

function getNeo4jSession(options = {}) {
  const driver = getNeo4jDriver();
  const { database } = ensureNeo4jConfig();
  return driver.session({
    database,
    defaultAccessMode: options.read ? neo4j.session.READ : neo4j.session.WRITE,
  });
}

async function closeNeo4jDriver() {
  if (!globalRef.__localEffortNeo4jDriver) return;
  await globalRef.__localEffortNeo4jDriver.close();
  globalRef.__localEffortNeo4jDriver = null;
}

async function verifyNeo4jConnection() {
  const driver = getNeo4jDriver();
  const config = ensureNeo4jConfig();
  const serverInfo = await driver.getServerInfo();
  const session = getNeo4jSession({ read: true });
  try {
    const result = await session.run('RETURN 1 AS ok, datetime() AS checkedAt');
    const record = result.records[0];
    return {
      address: serverInfo.address,
      agent: serverInfo.agent,
      protocolVersion: serverInfo.protocolVersion,
      database: config.database,
      checkedAt: String(record?.get('checkedAt') || ''),
      ok: Number(record?.get('ok') || 0) === 1,
    };
  } finally {
    await session.close();
  }
}

function sanitizeIdentifier(value, fallback = 'UNKNOWN') {
  const normalized = String(value || fallback)
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  if (!normalized) return fallback;
  return /^[0-9]/.test(normalized) ? `N_${normalized}` : normalized;
}

function toNeo4jValue(value) {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    const converted = value.map((item) => toNeo4jValue(item));
    const allPrimitive = converted.every((item) =>
      item === undefined ||
      item === null ||
      ['string', 'number', 'boolean'].includes(typeof item)
    );
    return allPrimitive ? converted.filter((item) => item !== undefined) : JSON.stringify(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function toNeo4jProperties(input) {
  const properties = {};
  for (const [key, value] of Object.entries(input || {})) {
    const converted = toNeo4jValue(value);
    if (converted !== undefined) {
      properties[key] = converted;
    }
  }
  return properties;
}

module.exports = {
  closeNeo4jDriver,
  ensureNeo4jConfig,
  getNeo4jDriver,
  getNeo4jSession,
  resolveNeo4jConfig,
  sanitizeIdentifier,
  toNeo4jProperties,
  verifyNeo4jConnection,
};
