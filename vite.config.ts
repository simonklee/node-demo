import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

export default defineConfig({
  plugins: [
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
  build: {
    target: "es2022",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: "esm",
        entryFileNames: "[name].mjs",
      },
    },
  },
})
