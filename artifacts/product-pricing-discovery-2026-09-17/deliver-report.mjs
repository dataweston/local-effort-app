import { deliverPortableArtifact } from "../../../.codex/plugins/cache/openai-curated-remote/data-analytics/0.2.10-13ceeea1f599/skills/build-report/scripts/deliver_portable_artifact.mjs";
import { buildPortableArtifact } from "../../../.codex/plugins/cache/openai-curated-remote/data-analytics/0.2.10-13ceeea1f599/skills/build-report/scripts/build_portable_artifact.mjs";

const inputPath = new URL("./artifact.json", import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1");
const outputPath = new URL("./report.html", import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1");

function buildWithoutScrollbarOverflow(input, options) {
  return buildPortableArtifact(input, options)
    .replace(
      "html,body{margin:0;min-height:100%;",
      "html,body{margin:0;min-height:100%;overflow-x:clip;",
    )
    .replace(
      "width:100vw;height:48px;min-height:48px;margin-right:calc(50% - 50vw);margin-left:calc(50% - 50vw)",
      "width:100%;height:48px;min-height:48px;margin-right:0;margin-left:0",
    );
}

const result = await deliverPortableArtifact(
  {
    inputPath,
    outputPath,
    screenshotPath: `${outputPath}.verification-failure.png`,
  },
  { build: buildWithoutScrollbarOverflow },
);

process.stdout.write(`${JSON.stringify(result)}\n`);
