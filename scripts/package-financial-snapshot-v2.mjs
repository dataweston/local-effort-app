import { readFileSync, writeFileSync } from 'node:fs';
import { buildPortableArtifact } from 'file:///C:/Users/user/.codex/plugins/cache/openai-curated-remote/data-analytics/0.2.8-13ceeea1f599/skills/build-report/scripts/build_portable_artifact.mjs';
import { verifyPortableArtifactStructure } from 'file:///C:/Users/user/.codex/plugins/cache/openai-curated-remote/data-analytics/0.2.8-13ceeea1f599/skills/build-report/scripts/verify_portable_artifact.mjs';

const artifactPath = 'artifacts/financial-snapshot-v2/artifact.json';
const outputPath = 'artifacts/financial-snapshot-v2/report.html';
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
writeFileSync(outputPath, buildPortableArtifact(artifact), 'utf8');
console.log(JSON.stringify(verifyPortableArtifactStructure({ artifactPath, htmlPath: outputPath }), null, 2));
