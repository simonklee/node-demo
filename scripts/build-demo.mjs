import { demoTargets, parseTargets, run } from "./demo-utils.mjs"

for (const target of parseTargets(process.argv[2])) {
  const demo = demoTargets[target]
  run("vite", ["build", "--ssr", demo.entry, "--outDir", demo.outDir])
}
