import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import { opentuiSeaPlugin } from "./vite.sea.shared"

const seaDemo = process.env.SEA_DEMO === "core" ? "core" : "solid"
const seaEntry = seaDemo === "core" ? "src/demo-core.ts" : "src/demo-solid.tsx"
const emptyOutDir = process.env.KEEP_DIST_SEA !== "1"

export default defineConfig({
  plugins: [
    opentuiSeaPlugin(),
    solid({
      solid: {
        generate: "universal",
        moduleName: "@opentui/solid",
      },
    }),
  ],
  resolve: {
    alias: [
      { find: /^solid-js\/store$/, replacement: "solid-js/store/dist/store.js" },
      { find: /^solid-js$/, replacement: "solid-js/dist/solid.js" },
    ],
  },
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: seaEntry,
    target: "es2022",
    outDir: "dist-sea",
    emptyOutDir,
    minify: false,
    rollupOptions: {
      output: {
        format: "esm",
        entryFileNames: `demo-${seaDemo}-sea.mjs`,
        inlineDynamicImports: true,
      },
    },
  },
})
