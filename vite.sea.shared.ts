import { resolve } from "node:path"
import type { Plugin } from "vite"
import { opentuiNativePackageName, opentuiParserWorkerAssetKey } from "./sea-target.js"

const seaAssetsModule = resolve("src/sea-assets.ts")

function prependImport(code: string, names: string[]): string {
  const imports = `import { ${names.join(", ")} } from ${JSON.stringify(seaAssetsModule)}\n`
  return code.includes(imports) ? code : imports + code
}

function transformOpenTuiCore(code: string): string {
  let transformed = code.replace(
    /await resolveBundledFilePath\(\(\) => import\("(\.\/assets\/[^"]+)", \{ with: \{ type: "file" \} \}\), "[^"]+", import\.meta\.url\)/g,
    (_match, specifier: string) => `resolveOpenTuiCoreAssetPath(${JSON.stringify(specifier.slice(2))})`,
  )

  transformed = transformed.replace(
    "await import(`@opentui/core-${process.platform}-${process.arch}`)",
    `await import(${JSON.stringify(opentuiNativePackageName)})`,
  )

  transformed = transformed.replace(
    /await import\("@opentui\/core-[^"]+"\)/g,
    `await import(${JSON.stringify(opentuiNativePackageName)})`,
  )

  return transformed === code ? code : prependImport(transformed, ["resolveOpenTuiCoreAssetPath"])
}

function transformOpenTuiParserWorker(code: string): string {
  const transformed = code.replace(
    /await resolveBundledFilePath\(\(\) => import\("web-tree-sitter\/tree-sitter\.wasm", \{ with: \{ type: "wasm" \} \}\), \(\) => import\.meta\.resolve\("web-tree-sitter\/tree-sitter\.wasm"\), import\.meta\.url\)/g,
    "resolveWebTreeSitterWasmPath()",
  )

  return transformed === code ? code : prependImport(transformed, ["resolveWebTreeSitterWasmPath"])
}

export function opentuiSeaPlugin(): Plugin {
  return {
    name: "opentui-sea",
    enforce: "pre",
    resolveId(id) {
      if (id === opentuiNativePackageName) {
        return "\0opentui-core-native-sea"
      }

      return null
    },
    load(id) {
      if (id === "\0opentui-core-native-sea") {
        return `export { default } from ${JSON.stringify(resolve("src/opentui-native-sea.ts"))}`
      }

      return null
    },
    transform(code, id) {
      if (id.includes("node_modules/@opentui/core/index-")) {
        return transformOpenTuiCore(code)
      }

      if (id.endsWith(`node_modules/${opentuiParserWorkerAssetKey}`)) {
        return transformOpenTuiParserWorker(code)
      }

      return null
    },
  }
}
