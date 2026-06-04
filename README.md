# OpenTUI Node.js demo

A Node project that tests an OpenTUI snapshot of the Node.js build.

## Requirements

- `npm` (any modern Node works for installing dependencies and running the npm scripts)
- The OpenTUI renderer itself needs Node 26.3.0+ because it uses the current experimental `node:ffi` API

The wrapper scripts in `scripts/` resolve a Node 26.3.0+ binary in this order:

1. `$NODE_BIN`, if set
2. `.cache/node26/node-v26.3.0-<platform>-<arch>/bin/node`, if it exists
3. The Node running the wrapper script, if it is 26.3.0+
4. Otherwise, download Node 26.3.0 for the current host into `.cache/node26/`

The auto-download supports linux and darwin on x64 and arm64. It uses `curl`
(falling back to `wget`) and `tar`, which are present on every supported host.
The first build that needs it will pull the tarball; later runs reuse the
cached binary.

To force a specific binary, set `NODE_BIN`:

```bash
NODE_BIN="/path/to/node26" npm run test:core
```

## Install

```bash
npm install
```

## Builds

```bash
npm run build
```

Builds all artifacts for both implementations:

- `dist/core/demo-core.mjs`
- `dist/solid/demo-solid.mjs`
- `dist-sea/opentui-demo-core`
- `dist-sea/opentui-demo`

The SEA executables embed the bundled app, OpenTUI native library, parser
worker, parser `.wasm`/`.scm` files, and `web-tree-sitter/tree-sitter.wasm`.

```bash
npm run build:core
```

Builds only the direct core renderable artifacts: the normal Vite bundle and
the core SEA executable.

```bash
npm run build:solid
```

Builds only the Solid binding artifacts: the normal Vite bundle and the Solid
SEA executable.

## Interactive runs

Run `npm run build` first. The start commands run already-built artifacts, so normal and SEA starts behave the same way.

```bash
npm run start:core
```

Starts the built direct core renderable bundle.

```bash
npm run start:solid
```

Starts the built Solid binding bundle.

Pass markdown files after `--` to load only those files instead of the bundled demo documents:

```bash
npm run start:solid -- ./notes.md ../other-doc.md
npm run start:core:sea -- ./notes.md
```

Controls for both demos:

- `Tab` / `Shift+Tab`: move focus between Library and Reader
- `n` / `p`: open the next or previous document
- Library focus: `j` / `k` selects the next or previous document, `gg` / `Shift+G` jumps to the first or last document
- Reader focus: `j` / `k` scrolls one line, `Ctrl+D` / `Ctrl+U` scrolls half a page, `gg` / `Shift+G` jumps to top or bottom
- `r`: reload the active document set
- `PageUp` / `PageDown`: scroll the reader when focused
- `?` / `F1`: toggle help
- `q` / `Ctrl+Q`: quit

## Packaged runs

```bash
npm run start:core:sea
```

Starts the built core SEA executable.

```bash
npm run start:solid:sea
```

Starts the built Solid SEA executable.

## Renderer tests

```bash
npm run test
```

Builds everything, then runs the normal bundles and SEA executables
sequentially in non-interactive `--test` mode.

```bash
npm run test:core
```

Builds and tests the core-only normal bundle and core SEA executable. Covers
the native renderer, core renderables, `MarkdownRenderable`, parser worker
startup, and parser assets without involving Solid.

```bash
npm run test:solid
```

Builds and tests the Solid normal bundle and Solid SEA executable. Compare the
results with `test:core` to find Solid-specific behavior.
