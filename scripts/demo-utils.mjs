import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, realpathSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const root = fileURLToPath(new URL("../", import.meta.url))

const NODE_VERSION = "26.1.0"

export const demoTargets = {
  core: {
    entry: "src/demo-core.ts",
    outDir: "dist/core",
    bundle: "dist/core/demo-core.mjs",
    seaConfig: "sea.core.config.json",
    seaExecutable: "dist-sea/opentui-demo-core",
  },
  solid: {
    entry: "src/demo-solid.tsx",
    outDir: "dist/solid",
    bundle: "dist/solid/demo-solid.mjs",
    seaConfig: "sea.config.json",
    seaExecutable: "dist-sea/opentui-demo",
  },
}

export function parseTargets(target = "both") {
  if (target === "both") {
    return ["core", "solid"]
  }

  if (target === "core" || target === "solid") {
    return [target]
  }

  throw new Error(`Expected target to be "core", "solid", or "both". Received: ${target}`)
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const demoFlags = new Set(["--test"])

function getDocumentFileArgs(args = []) {
  const files = []
  let parseFlags = true

  for (const arg of args) {
    if (!arg) {
      continue
    }

    if (parseFlags && arg === "--") {
      parseFlags = false
      continue
    }

    if (parseFlags && (demoFlags.has(arg) || arg.startsWith("--"))) {
      continue
    }

    files.push(arg)
  }

  return files
}

function fsReadPermissionsForArgs(args = []) {
  const readPaths = []
  const seen = new Set()

  const addPath = (filePath) => {
    if (!seen.has(filePath)) {
      seen.add(filePath)
      readPaths.push(filePath)
    }
  }

  addPath(root)
  addPath(realpathSync(root))

  for (const pathArg of getDocumentFileArgs(args)) {
    const filePath = resolve(root, pathArg)
    addPath(filePath)

    if (existsSync(filePath)) {
      addPath(realpathSync(filePath))
    }
  }

  return readPaths.map((filePath) => `--allow-fs-read=${filePath}`)
}

function nodeArchiveName() {
  return `node-v${NODE_VERSION}-${process.platform}-${process.arch}`
}

function cachedNodeBinary() {
  return join(root, ".cache/node26", nodeArchiveName(), "bin/node")
}

function checkNodeMajor(binary) {
  const version = spawnSync(binary, ["--version"], { encoding: "utf8" })

  if (version.error || version.status !== 0) {
    return { ok: false, message: `Unable to run Node binary: ${binary}` }
  }

  const major = Number(version.stdout.trim().replace(/^v/, "").split(".")[0])
  if (major < 26) {
    return {
      ok: false,
      message: `OpenTUI renderer requires Node 26+. Found ${version.stdout.trim()} at ${binary}.`,
    }
  }

  return { ok: true }
}

function downloadFile(url, dest) {
  const curl = spawnSync("curl", ["-fL", "--retry", "3", "-o", dest, url], { stdio: "inherit" })
  if (curl.status === 0) {
    return
  }
  if (curl.error && curl.error.code !== "ENOENT") {
    throw curl.error
  }

  const wget = spawnSync("wget", ["--tries=3", "-O", dest, url], { stdio: "inherit" })
  if (wget.status === 0) {
    return
  }
  if (wget.error && wget.error.code === "ENOENT") {
    throw new Error(`Need curl or wget to download Node ${NODE_VERSION}. Install one, or set NODE_BIN to a Node 26+ binary.`)
  }

  throw new Error(`Failed to download ${url}.`)
}

function downloadNode26() {
  if (process.platform !== "linux" && process.platform !== "darwin") {
    throw new Error(
      `Auto-download supports linux and darwin only. Detected ${process.platform}. Set NODE_BIN to a Node ${NODE_VERSION}+ binary.`,
    )
  }

  if (process.arch !== "x64" && process.arch !== "arm64") {
    throw new Error(
      `Auto-download supports x64 and arm64 only. Detected ${process.arch}. Set NODE_BIN to a Node ${NODE_VERSION}+ binary.`,
    )
  }

  const name = nodeArchiveName()
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/${name}.tar.gz`
  const cacheDir = join(root, ".cache/node26")
  const archive = join(cacheDir, `${name}.tar.gz`)
  const binary = cachedNodeBinary()

  mkdirSync(cacheDir, { recursive: true })

  console.error(`Downloading Node ${NODE_VERSION} for ${process.platform}-${process.arch}...`)
  console.error(`  ${url}`)
  downloadFile(url, archive)

  const extract = spawnSync("tar", ["-xzf", archive, "-C", cacheDir], { stdio: "inherit" })
  if (extract.error || extract.status !== 0) {
    throw new Error(`Failed to extract ${archive}. Install tar, or set NODE_BIN.`)
  }

  try {
    rmSync(archive)
  } catch {
    // ignore cleanup failure
  }

  return binary
}

export function resolveFfiNode() {
  const override = process.env.NODE_BIN
  if (override) {
    const check = checkNodeMajor(override)
    if (!check.ok) {
      throw new Error(check.message)
    }
    return override
  }

  const cached = cachedNodeBinary()
  if (existsSync(cached)) {
    const check = checkNodeMajor(cached)
    if (!check.ok) {
      throw new Error(check.message)
    }
    return cached
  }

  // Skip downloading if the Node running this script is already 26+.
  if (checkNodeMajor(process.execPath).ok) {
    return process.execPath
  }

  const downloaded = downloadNode26()
  const check = checkNodeMajor(downloaded)
  if (!check.ok) {
    throw new Error(check.message)
  }
  return downloaded
}

export function nodeFfiArgs(entry, args = []) {
  const realRoot = realpathSync(root)

  return [
    "--disable-warning=SecurityWarning",
    "--disable-warning=ExperimentalWarning",
    "--permission",
    ...fsReadPermissionsForArgs(args),
    `--allow-fs-write=${root}`,
    `--allow-fs-write=${realRoot}`,
    "--allow-worker",
    "--allow-ffi",
    "--experimental-ffi",
    entry,
    ...args,
  ]
}
