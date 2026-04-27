require('dotenv').config();

const { getPrisma, ensureDatabaseUrl } = require('../backend/api/utils/prisma');
const {
  closeNeo4jDriver,
  ensureNeo4jConfig,
  getNeo4jSession,
  sanitizeIdentifier,
  toNeo4jProperties,
  verifyNeo4jConnection,
} = require('../backend/api/utils/neo4j');

function parseArgs(argv) {
  return {
    reset: argv.includes('--reset'),
    skipInbox: argv.includes('--skip-inbox'),
    skipInferences: argv.includes('--skip-inferences'),
  };
}

function chunk(items, size = 250) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function ensureConstraints(session) {
  const statements = [
    'CREATE CONSTRAINT brain_entity_id IF NOT EXISTS FOR (n:BrainEntity) REQUIRE n.id IS UNIQUE',
    'CREATE CONSTRAINT brain_inbox_item_id IF NOT EXISTS FOR (n:BrainInboxItem) REQUIRE n.id IS UNIQUE',
  ];
  for (const statement of statements) {
    await session.run(statement);
  }
}

async function resetProjection(session, options) {
  await session.run('MATCH (n:BrainEntity) DETACH DELETE n');
  if (!options.skipInbox) {
    await session.run('MATCH (n:BrainInboxItem) DETACH DELETE n');
  }
}

async function syncEntities(session, entities) {
  const byLabel = new Map();

  for (const entity of entities) {
    const label = sanitizeIdentifier(entity.entityType, 'GENERIC');
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push({
      id: entity.id,
      props: toNeo4jProperties({
        id: entity.id,
        entityType: entity.entityType,
        name: entity.name,
        status: entity.status,
        visibility: entity.visibility,
        shareToken: entity.shareToken,
        snoozeUntil: entity.snoozeUntil,
        tombstonedAt: entity.tombstonedAt,
        tombstoneReason: entity.tombstoneReason,
        localEffortCustomerId: entity.localEffortCustomerId,
        localEffortDishId: entity.localEffortDishId,
        localBudgetVendorId: entity.localBudgetVendorId,
        squareCustomerId: entity.squareCustomerId,
        plannerCardId: entity.plannerCardId,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        aliases: entity.aliases.map((alias) => alias.alias),
        aliasSources: entity.aliases.map((alias) => alias.source),
        propertiesJson: entity.properties,
      }),
    });
  }

  for (const [label, rows] of byLabel.entries()) {
    for (const batch of chunk(rows)) {
      await session.run(
        `
          UNWIND $rows AS row
          MERGE (n:BrainEntity:\`${label}\` {id: row.id})
          SET n += row.props
        `,
        { rows: batch }
      );
    }
  }
}

async function syncAssertionRelationships(session, assertions) {
  const byType = new Map();

  for (const assertion of assertions) {
    const relType = `ASSERTS_${sanitizeIdentifier(assertion.relType, 'RELATED_TO')}`;
    if (!byType.has(relType)) byType.set(relType, []);
    byType.get(relType).push({
      id: assertion.id,
      srcId: assertion.srcId,
      dstId: assertion.dstId,
      props: toNeo4jProperties({
        id: assertion.id,
        kind: 'assertion',
        relType: assertion.relType,
        srcId: assertion.srcId,
        dstId: assertion.dstId,
        validFrom: assertion.validFrom,
        validUntil: assertion.validUntil,
        knownFrom: assertion.knownFrom,
        knownUntil: assertion.knownUntil,
        confidence: assertion.confidence,
        sourceType: assertion.sourceType,
        sourceId: assertion.sourceId,
        createdBy: assertion.createdBy,
        supersededBy: assertion.supersededBy,
        supersededAt: assertion.supersededAt,
        supersededReason: assertion.supersededReason,
        retractedAt: assertion.retractedAt,
        retractedBy: assertion.retractedBy,
        retractedReason: assertion.retractedReason,
        retractionSourceId: assertion.retractionSourceId,
        provisional: assertion.provisional,
        confirmedAt: assertion.confirmedAt,
        confirmedBy: assertion.confirmedBy,
        createdAt: assertion.createdAt,
        metadataJson: assertion.metadata,
      }),
    });
  }

  for (const [relType, rows] of byType.entries()) {
    for (const batch of chunk(rows)) {
      await session.run(
        `
          UNWIND $rows AS row
          MATCH (src:BrainEntity {id: row.srcId})
          MATCH (dst:BrainEntity {id: row.dstId})
          MERGE (src)-[r:\`${relType}\` {id: row.id}]->(dst)
          SET r += row.props
        `,
        { rows: batch }
      );
    }
  }
}

async function syncInferenceRelationships(session, inferences) {
  const byType = new Map();

  for (const inference of inferences) {
    const relType = `INFERS_${sanitizeIdentifier(inference.inferenceType, 'RELATED_TO')}`;
    if (!byType.has(relType)) byType.set(relType, []);
    byType.get(relType).push({
      id: inference.id,
      srcId: inference.srcId,
      dstId: inference.dstId,
      props: toNeo4jProperties({
        id: inference.id,
        kind: 'inference',
        inferenceType: inference.inferenceType,
        srcId: inference.srcId,
        dstId: inference.dstId,
        confidence: inference.confidence,
        decayRate: inference.decayRate,
        knownFrom: inference.knownFrom,
        knownUntil: inference.knownUntil,
        computedAt: inference.computedAt,
        computedFrom: inference.computedFrom,
        summary: inference.summary,
        staleAt: inference.staleAt,
        staleReason: inference.staleReason,
        supersededBy: inference.supersededBy,
      }),
    });
  }

  for (const [relType, rows] of byType.entries()) {
    for (const batch of chunk(rows)) {
      await session.run(
        `
          UNWIND $rows AS row
          MATCH (src:BrainEntity {id: row.srcId})
          MATCH (dst:BrainEntity {id: row.dstId})
          MERGE (src)-[r:\`${relType}\` {id: row.id}]->(dst)
          SET r += row.props
        `,
        { rows: batch }
      );
    }
  }
}

async function syncInboxItems(session, inboxItems) {
  for (const batch of chunk(inboxItems.map((item) => ({
    id: item.id,
    resultEntityId: item.resultEntityId,
    props: toNeo4jProperties({
      id: item.id,
      rawContent: item.rawContent,
      source: item.source,
      attachmentsJson: item.attachments,
      capturedAt: item.capturedAt,
      status: item.status,
      processedAt: item.processedAt,
      resultEntityId: item.resultEntityId,
    }),
  })))) {
    await session.run(
      `
        UNWIND $rows AS row
        MERGE (item:BrainInboxItem {id: row.id})
        SET item += row.props
      `,
      { rows: batch }
    );

    await session.run(
      `
        UNWIND $rows AS row
        WITH row WHERE row.resultEntityId IS NOT NULL
        MATCH (item:BrainInboxItem {id: row.id})
        MATCH (entity:BrainEntity {id: row.resultEntityId})
        MERGE (item)-[:RESULTED_IN]->(entity)
      `,
      { rows: batch }
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureDatabaseUrl();
  ensureNeo4jConfig();

  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Prisma client unavailable. Set DATABASE_URL before syncing.');
  }

  const connection = await verifyNeo4jConnection();
  console.log('[brain-neo4j-sync] connected', JSON.stringify(connection));

  const [entities, assertions, inferences, inboxItems] = await Promise.all([
    prisma.brainEntity.findMany({
      include: {
        aliases: {
          select: { alias: true, source: true },
          orderBy: { alias: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.brainAssertion.findMany({ orderBy: { createdAt: 'asc' } }),
    options.skipInferences
      ? Promise.resolve([])
      : prisma.brainInference.findMany({ orderBy: { computedAt: 'asc' } }),
    options.skipInbox
      ? Promise.resolve([])
      : prisma.brainInboxItem.findMany({ orderBy: { capturedAt: 'asc' } }),
  ]);

  const session = getNeo4jSession();
  try {
    await ensureConstraints(session);
    if (options.reset) {
      await resetProjection(session, options);
    }
    await syncEntities(session, entities);
    await syncAssertionRelationships(session, assertions);
    if (!options.skipInferences) {
      await syncInferenceRelationships(session, inferences);
    }
    if (!options.skipInbox) {
      await syncInboxItems(session, inboxItems);
    }
  } finally {
    await session.close();
  }

  console.log(JSON.stringify({
    entities: entities.length,
    assertions: assertions.length,
    inferences: options.skipInferences ? 0 : inferences.length,
    inboxItems: options.skipInbox ? 0 : inboxItems.length,
    reset: options.reset,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('[brain-neo4j-sync] failed:', error && error.message ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeNeo4jDriver();
  });
