import { readFile } from "node:fs/promises"
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path"
import { createCliRenderer, parseColor, SyntaxStyle, type CliRenderer } from "@opentui/core"
import { configureOpenTuiSeaAssets } from "./sea-assets"

export type FocusZone = "library" | "reader"

export interface DocumentEntry {
  id: string
  title: string
  description: string
  content: string
  path: string
}

export interface HelpCommand {
  name: string
  label: string
}

export const palette = {
  bg: "#0D1117",
  sidebar: "#010409",
  reader: "#0D1117",
  selection: "#1F6FEB",
  selectionMuted: "#F0F6FC",
  overlay: "#161B22",
  border: "#30363D",
  focus: "#58A6FF",
  text: "#E6EDF3",
  muted: "#8B949E",
  dim: "#6E7681",
  accent: "#7EE787",
  warning: "#D29922",
  rawBg: "#161B22",
  tableBorder: "#30363D",
} as const

const markdownStyles = {
  keyword: { fg: parseColor("#FF7B72"), bold: true },
  string: { fg: parseColor("#A5D6FF") },
  comment: { fg: parseColor("#8B949E"), italic: true },
  number: { fg: parseColor("#79C0FF") },
  function: { fg: parseColor("#D2A8FF") },
  type: { fg: parseColor("#FFA657") },
  operator: { fg: parseColor("#FF7B72") },
  variable: { fg: parseColor("#E6EDF3") },
  property: { fg: parseColor("#79C0FF") },
  "punctuation.bracket": { fg: parseColor("#F0F6FC") },
  "punctuation.delimiter": { fg: parseColor("#C9D1D9") },
  "punctuation.special": { fg: parseColor("#8B949E") },
  "markup.heading": { fg: parseColor("#58A6FF"), bold: true },
  "markup.heading.1": { fg: parseColor("#7EE787"), bold: true, underline: true },
  "markup.heading.2": { fg: parseColor("#58A6FF"), bold: true },
  "markup.heading.3": { fg: parseColor("#D2A8FF"), bold: true },
  "markup.bold": { fg: parseColor("#F0F6FC"), bold: true },
  "markup.strong": { fg: parseColor("#F0F6FC"), bold: true },
  "markup.italic": { fg: parseColor("#F0F6FC"), italic: true },
  "markup.list": { fg: parseColor("#FF7B72") },
  "markup.quote": { fg: parseColor("#8B949E"), italic: true },
  "markup.raw": { fg: parseColor("#A5D6FF"), bg: parseColor(palette.rawBg) },
  "markup.raw.block": { fg: parseColor("#A5D6FF"), bg: parseColor(palette.rawBg) },
  "markup.raw.inline": { fg: parseColor("#A5D6FF"), bg: parseColor(palette.rawBg) },
  "markup.link": { fg: parseColor("#58A6FF"), underline: true },
  "markup.link.label": { fg: parseColor("#A5D6FF"), underline: true },
  "markup.link.url": { fg: parseColor("#58A6FF"), underline: true },
  "diff.plus": { fg: parseColor("#3FB950") },
  "diff.minus": { fg: parseColor("#F85149") },
  label: { fg: parseColor("#7EE787") },
  conceal: { fg: parseColor("#6E7681") },
  default: { fg: parseColor(palette.text) },
}

export const focusZones: readonly FocusZone[] = ["library", "reader"]

export const keyFormatOptions = {
  keyNameAliases: { pagedown: "pgdn", pageup: "pgup" },
  modifierAliases: { meta: "alt" },
  separator: " ",
} as const

export const markdownTableOptions = {
  style: "grid",
  widthMode: "content",
  cellPaddingX: 1,
  borderColor: palette.tableBorder,
} as const

export const helpCommands: readonly HelpCommand[] = [
  { name: "app.focus.next", label: "Next pane" },
  { name: "app.focus.previous", label: "Previous pane" },
  { name: "app.doc.next", label: "Next document" },
  { name: "app.doc.previous", label: "Previous document" },
  { name: "app.docs.refresh", label: "Reload documents" },
  { name: "library.select.next", label: "Library down" },
  { name: "library.select.previous", label: "Library up" },
  { name: "library.select.first", label: "First document" },
  { name: "library.select.last", label: "Last document" },
  { name: "reader.line.down", label: "Scroll down" },
  { name: "reader.line.up", label: "Scroll up" },
  { name: "reader.half.up", label: "Half page up" },
  { name: "reader.half.down", label: "Half page down" },
  { name: "reader.page.up", label: "Page up" },
  { name: "reader.page.down", label: "Page down" },
  { name: "reader.top", label: "Reader top" },
  { name: "reader.bottom", label: "Reader bottom" },
  { name: "app.help.toggle", label: "Toggle help" },
  { name: "app.quit", label: "Quit" },
] as const

const embeddedSampleContent = [
  "# Terminal Markdown Reader",
  "",
  "This document is built into the demo shared module, so both renderers always have something real to render.",
  "",
  "## What this screen exercises",
  "",
  "- `@opentui/core` for the renderer and markdown renderable",
  "- `@opentui/solid` only in the Solid entry point",
  "- `@opentui/keymap` for global and pane-local bindings",
  "- `<markdown>` or `MarkdownRenderable` for headings, lists, tables, quotes, and code fences",
  "",
  "## Code fence",
  "",
  "```ts",
  "const documents = await loadDocuments()",
  "console.log(`Loaded ${documents.length} docs`)",
  "```",
  "",
  "> Tip: press `Tab` to move between the Library and Reader panes.",
  "",
  "## Table",
  "",
  "| Key | Action |",
  "| --- | ------ |",
  "| `n` | Open the next document |",
  "| `p` | Open the previous document |",
  "| `r` | Reload docs from the repo root |",
].join("\n")

const curatedDocuments = [
  {
    id: "readme",
    title: "README",
    description: "Project overview and run instructions.",
    path: "README.md",
  },

] as const

const demoFlags = new Set(["--test"])

export function isTestMode(): boolean {
  return process.argv.includes("--test")
}

function getDocumentFileArgs(args = process.argv.slice(2)): string[] {
  const files: string[] = []
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

function formatDisplayPath(filePath: string, cwd: string): string {
  const relativePath = relative(cwd, filePath)

  if (relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath)) {
    return relativePath
  }

  return filePath
}

function getDocumentTitle(filePath: string, content: string): string {
  const heading = /^#\s+(.+?)\s*#*\s*$/m.exec(content)?.[1]?.trim()

  if (heading) {
    return heading
  }

  return basename(filePath, extname(filePath)) || basename(filePath) || filePath
}

async function loadCommandLineDocuments(cwd: string, pathArgs: readonly string[]): Promise<DocumentEntry[]> {
  const loadedFiles = await Promise.all(
    pathArgs.map(async (pathArg, index): Promise<DocumentEntry | null> => {
      const filePath = resolve(cwd, pathArg)

      try {
        const content = await readFile(filePath, "utf8")

        return {
          id: `cli-${index}-${filePath}`,
          title: getDocumentTitle(filePath, content),
          description: "Loaded from command line.",
          content,
          path: formatDisplayPath(filePath, cwd),
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`Skipping ${pathArg}: ${message}`)
        return null
      }
    }),
  )

  return loadedFiles.filter((document): document is DocumentEntry => document !== null)
}

export function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0
  }

  return Math.max(0, Math.min(index, length - 1))
}

export function formatDocumentCount(count: number): string {
  return `${count} doc${count === 1 ? "" : "s"} loaded`
}

export function getDocumentAt(documents: readonly DocumentEntry[], index: number): DocumentEntry | null {
  return documents[clampIndex(index, documents.length)] ?? null
}

export function getLibraryOptions(documents: readonly DocumentEntry[]) {
  return documents.map((document, index) => ({
    name: document.path,
    description: `${index + 1}/${documents.length}  ${document.title}`,
    value: document.id,
  }))
}

export function createMarkdownSyntaxStyle(): SyntaxStyle {
  return SyntaxStyle.fromStyles(markdownStyles)
}

export function createMarkdownOptions(content: string, syntaxStyle: SyntaxStyle) {
  return {
    width: "100%" as const,
    content,
    syntaxStyle,
    fg: palette.text,
    bg: palette.reader,
    conceal: true,
    internalBlockMode: "top-level" as const,
    tableOptions: markdownTableOptions,
  }
}

export async function loadDocuments(): Promise<DocumentEntry[]> {
  const cwd = process.cwd()
  const commandLineDocumentArgs = getDocumentFileArgs()

  if (commandLineDocumentArgs.length > 0) {
    return await loadCommandLineDocuments(cwd, commandLineDocumentArgs)
  }

  const loadedFiles = await Promise.all(
    curatedDocuments.map(async (candidate): Promise<DocumentEntry | null> => {
      try {
        const content = await readFile(join(cwd, candidate.path), "utf8")
        return {
          id: candidate.id,
          title: candidate.title,
          description: candidate.description,
          content,
          path: candidate.path,
        }
      } catch {
        return null
      }
    }),
  )

  return [
    ...loadedFiles.filter((document): document is DocumentEntry => document !== null),
    {
      id: "embedded-sample",
      title: "Sample",
      description: "A sample document",
      content: embeddedSampleContent,
      path: "demo.md",
    },
  ]
}

export async function createDemoRenderer(): Promise<CliRenderer> {
  configureOpenTuiSeaAssets()

  return await createCliRenderer({
    backgroundColor: palette.bg,
    clearOnShutdown: true,
    screenMode: "alternate-screen",
    targetFps: 30,
    useKittyKeyboard: {
      alternateKeys: true,
      disambiguate: true,
      events: true,
    },
  })
}
