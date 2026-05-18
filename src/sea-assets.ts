import { opentuiParserWorkerAssetKey, webTreeSitterWasmAssetKey } from "../sea-target.js"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { getRawAsset, isSea } from "node:sea"
import { fileURLToPath } from "node:url"

const extractionRoot = join(tmpdir(), "opentui-node-sea", `${process.platform}-${process.arch}`)

function writeSeaAsset(assetKey: string): string {
  const target = join(extractionRoot, assetKey)

  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, new Uint8Array(getRawAsset(assetKey)))

  return target
}

export function resolveSeaAssetPath(assetKey: string, fallbackNodeModulesPath: string): string {
  if (isSea()) {
    return writeSeaAsset(assetKey)
  }

  return fileURLToPath(new URL(`../node_modules/${fallbackNodeModulesPath}`, import.meta.url))
}

export function resolveSeaBundleAssetPath(assetKey: string, fallbackRelativePath: string): string {
  if (isSea()) {
    return writeSeaAsset(assetKey)
  }

  return fileURLToPath(new URL(fallbackRelativePath, import.meta.url))
}

export function resolveOpenTuiCoreAssetPath(relativePath: string): string {
  const packagePath = `@opentui/core/${relativePath}`
  return resolveSeaAssetPath(packagePath, packagePath)
}

export function resolveWebTreeSitterWasmPath(): string {
  return resolveSeaAssetPath(webTreeSitterWasmAssetKey, webTreeSitterWasmAssetKey)
}

export function configureOpenTuiSeaAssets(): void {
  const workerPath = resolveSeaBundleAssetPath(opentuiParserWorkerAssetKey, "./parser.worker.mjs")

  if (isSea() || existsSync(workerPath)) {
    process.env.OTUI_TREE_SITTER_WORKER_PATH = workerPath
  }
}
