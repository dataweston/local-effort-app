# Brain to Neo4j

This repo's Brain system is stored in Prisma tables, with the graph centered on:

- `BrainEntity`
- `BrainAssertion`
- `BrainInference`
- `BrainInboxItem`

## Current Mapping

The one-off sync script maps the Prisma Brain model into Neo4j as follows:

- `(:BrainEntity)` nodes for every `BrainEntity` row.
- Extra typed labels on those nodes based on `entityType`, for example `(:BrainEntity:VENDOR)` or `(:BrainEntity:CUSTOMER)`.
- Assertion relationships from `BrainAssertion` as `[:ASSERTS_<RELTYPE>]`.
- Inference relationships from `BrainInference` as `[:INFERS_<INFERENCETYPE>]`.
- `(:BrainInboxItem)` nodes for captured inbox items.
- `(:BrainInboxItem)-[:RESULTED_IN]->(:BrainEntity)` when an inbox item was resolved into an entity.

Most JSON-heavy fields are stored as stringified `...Json` properties in Neo4j. Primitive fields stay queryable as first-class properties.

## Example Shape

Prisma:

- `BrainEntity(id=customer-1, entityType=Customer, name=Levy Family)`
- `BrainEntity(id=dish-1, entityType=Dish, name=Chicken Tikka Masala)`
- `BrainAssertion(srcId=customer-1, dstId=dish-1, relType=ORDERED)`
- `BrainInference(srcId=customer-1, dstId=dish-1, inferenceType=PREFERS)`

Neo4j:

```cypher
(:BrainEntity:CUSTOMER {id: "customer-1", name: "Levy Family"})
-[:ASSERTS_ORDERED]->
(:BrainEntity:DISH {id: "dish-1", name: "Chicken Tikka Masala"})

(:BrainEntity:CUSTOMER {id: "customer-1"})
-[:INFERS_PREFERS {confidence: 0.82}]->
(:BrainEntity:DISH {id: "dish-1"})
```

## Scripts

- `pnpm neo4j:test`
  Verifies the Aura connection using `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and `NEO4J_DATABASE`.

- `pnpm neo4j:brain:sync`
  Syncs Brain entities, assertions, inferences, and inbox items from Prisma into Neo4j.

- `pnpm neo4j:brain:sync:reset`
  Clears the synced Brain projection in Neo4j and rebuilds it from Prisma.

Optional flags for the sync script:

- `--reset`
- `--skip-inbox`
- `--skip-inferences`

## Environment

Set these before running the scripts:

```bash
NEO4J_URI=neo4j+s://<instance>.databases.neo4j.io
NEO4J_USERNAME=<username>
NEO4J_PASSWORD=<password>
NEO4J_DATABASE=<database>
DATABASE_URL=<prisma-postgres-url>
```

## GDS Uses

Once the graph is synced, the most useful first passes are:

1. Customer-to-dish preference scoring
   Use `ASSERTS_ORDERED`, `ASSERTS_GAVE_FEEDBACK`, and `INFERS_PREFERS`.

2. Vendor concentration and exposure
   Use ingredient, pricing, and sourcing relationships to detect single-vendor risk.

3. Menu clustering
   Group dishes by shared ingredient, customer, or feedback neighborhoods.

4. Inbox routing and enrichment
   Use similarity between inbox items and existing entities to suggest triage targets.

## Example GDS Projections

Customer preference graph:

```cypher
MATCH (src:BrainEntity)-[r]->(dst:BrainEntity)
WHERE type(r) IN ['ASSERTS_ORDERED', 'ASSERTS_GAVE_FEEDBACK', 'INFERS_PREFERS']
RETURN gds.graph.project(
  'brain-customer-preferences',
  src,
  dst,
  {
    relationshipProperties: r { .confidence, .kind }
  }
)
```

PageRank over inferred preference flows:

```cypher
CALL gds.pageRank.stream('brain-customer-preferences')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, score
ORDER BY score DESC
LIMIT 25
```

Node similarity for dish affinity:

```cypher
CALL gds.nodeSimilarity.stream('brain-customer-preferences')
YIELD node1, node2, similarity
RETURN
  gds.util.asNode(node1).name AS leftName,
  gds.util.asNode(node2).name AS rightName,
  similarity
ORDER BY similarity DESC
LIMIT 25
```

## Notes

- The sync is intentionally one-way and one-off. Neo4j is a projection, not the source of truth.
- If this becomes a regular pipeline, the next step should be an incremental sync keyed by `updatedAt` plus tombstone handling.
- If you want live GDS workflows, add a small read-only query layer that targets Neo4j for analytics and leaves Prisma as the operational store.
