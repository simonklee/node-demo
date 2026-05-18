export const opentuiNativePackageName = "@opentui/core-linux-x64"
export const opentuiNativeLibraryName = "libopentui.so"
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
