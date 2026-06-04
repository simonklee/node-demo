const opentuiNativeLibraryNames = {
  darwin: "libopentui.dylib",
  linux: "libopentui.so",
}

const supportedOpenTuiNativeArchitectures = new Set(["arm64", "x64"])

if (!opentuiNativeLibraryNames[process.platform] || !supportedOpenTuiNativeArchitectures.has(process.arch)) {
  throw new Error(`Unsupported OpenTUI native target: ${process.platform}-${process.arch}`)
}

const opentuiNativeLibcSuffix = process.platform === "linux" && process.env.OPENTUI_LIBC === "musl" ? "-musl" : ""

export const opentuiNativePackageName = `@opentui/core-${process.platform}-${process.arch}${opentuiNativeLibcSuffix}`
export const opentuiNativeLibraryName = opentuiNativeLibraryNames[process.platform]
export const opentuiNativeAssetKey = `${opentuiNativePackageName}/${opentuiNativeLibraryName}`

export const opentuiParserWorkerAssetKey = "@opentui/core/parser.worker.js"
export const webTreeSitterWasmAssetKey = "web-tree-sitter/tree-sitter.wasm"

export const opentuiParserAssetKeys = [
  "@opentui/core/assets/javascript/highlights.scm",
  "@opentui/core/assets/javascript/tree-sitter-javascript.wasm",
  "@opentui/core/assets/typescript/highlights.scm",
  "@opentui/core/assets/typescript/tree-sitter-typescript.wasm",
  "@opentui/core/assets/markdown/highlights.scm",
  "@opentui/core/assets/markdown/tree-sitter-markdown.wasm",
  "@opentui/core/assets/markdown/injections.scm",
  "@opentui/core/assets/markdown_inline/highlights.scm",
  "@opentui/core/assets/markdown_inline/tree-sitter-markdown_inline.wasm",
  "@opentui/core/assets/zig/highlights.scm",
  "@opentui/core/assets/zig/tree-sitter-zig.wasm",
]

export function createSeaAssetMap() {
  return Object.fromEntries([
    [opentuiNativeAssetKey, `node_modules/${opentuiNativeAssetKey}`],
    [opentuiParserWorkerAssetKey, "dist-sea/parser.worker.mjs"],
    ...opentuiParserAssetKeys.map((assetKey) => [assetKey, `node_modules/${assetKey}`]),
    [webTreeSitterWasmAssetKey, `node_modules/${webTreeSitterWasmAssetKey}`],
  ])
}
