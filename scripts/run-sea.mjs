import { demoTargets, parseTargets, run } from "./demo-utils.mjs"

const targetArg = process.argv[2] ?? "solid"
const passthroughArgs = process.argv.slice(3)

for (const target of parseTargets(targetArg)) {
  run(demoTargets[target].seaExecutable, passthroughArgs)
}
