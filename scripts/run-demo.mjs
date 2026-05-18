import { demoTargets, nodeFfiArgs, parseTargets, resolveFfiNode, run } from "./demo-utils.mjs"

const node = resolveFfiNode()
const targetArg = process.argv[2] ?? "solid"
const passthroughArgs = process.argv.slice(3)

for (const target of parseTargets(targetArg)) {
  run(node, nodeFfiArgs(demoTargets[target].bundle, passthroughArgs))
}
