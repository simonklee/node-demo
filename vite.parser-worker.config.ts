import { defineConfig } from "vite"
import { opentuiParserWorkerAssetKey } from "./sea-target.js"
import { opentuiSeaPlugin } from "./vite.sea.shared"

export default defineConfig({
  plugins: [opentuiSeaPlugin()],
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: `node_modules/${opentuiParserWorkerAssetKey}`,
    target: "es2022",
    outDir: "dist-sea",
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      output: {
        format: "esm",
        entryFileNames: "parser.worker.mjs",
        inlineDynamicImports: true,
      },
    },
  },
})
