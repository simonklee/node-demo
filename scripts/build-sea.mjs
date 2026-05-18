import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { createSeaAssetMap } from "../sea-target.js"
import { demoTargets, parseTargets, resolveFfiNode, root, run } from "./demo-utils.mjs"

const node = resolveFfiNode()
let keepDistSea = false

for (const target of parseTargets(process.argv[2])) {
  const demo = demoTargets[target]

  run("vite", ["build", "--config", "vite.sea.config.ts"], {
    env: {
      SEA_DEMO: target,
      ...(keepDistSea ? { KEEP_DIST_SEA: "1" } : {}),
    },
  })
  run("vite", ["build", "--config", "vite.parser-worker.config.ts"])

  const seaConfig = JSON.parse(readFileSync(join(root, demo.seaConfig), "utf8"))
  const generatedConfigPath = join("dist-sea", `${target}.sea.generated.json`)
  seaConfig.executable = node
  seaConfig.assets = createSeaAssetMap()
  writeFileSync(join(root, generatedConfigPath), `${JSON.stringify(seaConfig, null, 2)}\n`)

  run(node, ["--build-sea", generatedConfigPath])

  keepDistSea = true
}
