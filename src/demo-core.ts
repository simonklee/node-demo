import {
  BoxRenderable,
  MarkdownRenderable,
  ScrollBoxRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  TextRenderable,
} from "@opentui/core"
import { registerBaseLayoutFallback } from "@opentui/keymap/addons/opentui"
import { formatCommandBindings } from "@opentui/keymap/extras"
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui"
import {
  clampIndex,
  createDemoRenderer,
  createMarkdownOptions,
  createMarkdownSyntaxStyle,
  focusZones,
  formatDocumentCount,
  getDocumentAt,
  getLibraryOptions,
  helpCommands,
  isTestMode,
  keyFormatOptions,
  loadDocuments,
  palette,
  type DocumentEntry,
  type FocusZone,
} from "./demo-shared"

const sidebarWidth = 30

let documents: DocumentEntry[] = await loadDocuments()
let selectedIndex = 0
let focusZone: FocusZone = "library"
let showHelp = false

const renderer = await createDemoRenderer()
const markdownSyntaxStyle = createMarkdownSyntaxStyle()
const keymap = createDefaultOpenTuiKeymap(renderer)

registerBaseLayoutFallback(keymap)

const root = new BoxRenderable(renderer, {
  id: "core-demo-root",
  width: "100%",
  height: "100%",
  flexDirection: "row",
  backgroundColor: palette.bg,
})

const sidebar = new BoxRenderable(renderer, {
  id: "core-demo-sidebar",
  width: sidebarWidth,
  height: "100%",
  paddingX: 1,
  paddingY: 1,
  flexDirection: "column",
  gap: 1,
  backgroundColor: palette.sidebar,
})

const sidebarHeader = new BoxRenderable(renderer, {
  id: "core-demo-sidebar-header",
  width: "100%",
  flexDirection: "column",
})

const appTitle = new TextRenderable(renderer, {
  id: "core-demo-title",
  content: "opentui-node core",
  fg: palette.focus,
})

const documentCount = new TextRenderable(renderer, {
  id: "core-demo-document-count",
  content: formatDocumentCount(documents.length),
  fg: palette.dim,
})

const library = new SelectRenderable(renderer, {
  id: "core-demo-library",
  flexGrow: 1,
  width: "100%",
  options: getLibraryOptions(documents),
  selectedIndex,
  backgroundColor: palette.sidebar,
  textColor: palette.muted,
  focusedBackgroundColor: palette.sidebar,
  focusedTextColor: palette.text,
  selectedBackgroundColor: palette.selection,
  selectedTextColor: palette.selectionMuted,
  descriptionColor: palette.dim,
  selectedDescriptionColor: palette.selectionMuted,
  showDescription: false,
  showScrollIndicator: true,
})

const readerPane = new BoxRenderable(renderer, {
  id: "core-demo-reader-pane",
  flexGrow: 1,
  height: "100%",
  paddingX: 2,
  paddingY: 1,
  flexDirection: "column",
  gap: 1,
  backgroundColor: palette.reader,
})

const readerHeader = new BoxRenderable(renderer, {
  id: "core-demo-reader-header",
  width: "100%",
  height: 2,
  flexShrink: 0,
  flexDirection: "column",
})

const readerTitle = new TextRenderable(renderer, {
  id: "core-demo-reader-title",
  content: "No document selected",
  fg: palette.text,
  width: "100%",
  wrapMode: "none",
  truncate: true,
})

const readerSubtitle = new TextRenderable(renderer, {
  id: "core-demo-reader-subtitle",
  content: "no document",
  fg: palette.dim,
  width: "100%",
  wrapMode: "none",
  truncate: true,
})

const reader = new ScrollBoxRenderable(renderer, {
  id: "core-demo-reader",
  flexGrow: 1,
  width: "100%",
  scrollY: true,
  backgroundColor: palette.reader,
})

const markdown = new MarkdownRenderable(
  renderer,
  createMarkdownOptions(getDocumentAt(documents, selectedIndex)?.content ?? "", markdownSyntaxStyle),
)

const helpOverlay = new BoxRenderable(renderer, {
  id: "core-demo-help",
  position: "absolute",
  top: 2,
  right: 4,
  width: 58,
  height: 16,
  zIndex: 20,
  border: true,
  borderStyle: "rounded",
  borderColor: palette.focus,
  backgroundColor: palette.overlay,
  padding: 1,
  visible: false,
})

const helpText = new TextRenderable(renderer, {
  id: "core-demo-help-text",
  content: "Help",
  fg: palette.text,
})

sidebarHeader.add(appTitle)
sidebarHeader.add(documentCount)
sidebar.add(sidebarHeader)
sidebar.add(library)

readerHeader.add(readerTitle)
readerHeader.add(readerSubtitle)
reader.add(markdown)
readerPane.add(readerHeader)
readerPane.add(reader)

helpOverlay.add(helpText)
root.add(sidebar)
root.add(readerPane)
root.add(helpOverlay)
renderer.root.add(root)

function selectedDocument(): DocumentEntry | null {
  return getDocumentAt(documents, selectedIndex)
}

function refreshHelp(): void {
  const lines = helpCommands
    .map((command) => {
      const keys = formatCommandBindings(
        keymap.getCommandBindings({ visibility: "registered", commands: [command.name] }).get(command.name),
        keyFormatOptions,
      )

      return keys ? `${keys.padEnd(14)} ${command.label}` : null
    })
    .filter((line): line is string => line !== null)

  helpText.content = ["Help", ...lines, "", "Press ? or F1 to close."].join("\n")
  helpOverlay.visible = showHelp
}

function refreshView(): void {
  selectedIndex = clampIndex(selectedIndex, documents.length)

  const document = selectedDocument()

  documentCount.content = formatDocumentCount(documents.length)
  library.options = getLibraryOptions(documents)
  library.selectedIndex = selectedIndex
  readerTitle.content = document?.title ?? "No document selected"
  readerTitle.fg = focusZone === "reader" ? palette.focus : palette.text
  readerSubtitle.content = document?.description ?? "no document"
  markdown.content = document?.content ?? ""
  refreshHelp()

  if (focusZone === "library") {
    library.focus()
  } else {
    reader.focus()
  }

  renderer.requestRender()
}

function setDocumentIndex(index: number): void {
  const nextIndex = clampIndex(index, documents.length)

  if (nextIndex === selectedIndex) {
    return
  }

  selectedIndex = nextIndex
  reader.scrollTo({ x: 0, y: 0 })
  refreshView()
}

function moveDocument(direction: 1 | -1): void {
  setDocumentIndex(selectedIndex + direction)
}

function cycleFocus(direction: 1 | -1): void {
  const currentIndex = focusZones.indexOf(focusZone)
  const nextIndex = (currentIndex + direction + focusZones.length) % focusZones.length

  focusZone = focusZones[nextIndex] ?? "library"
  refreshView()
}

function scrollReaderPage(direction: 1 | -1): void {
  const step = Math.max(6, reader.height - 4)
  reader.scrollBy({ x: 0, y: direction * step })
}

function scrollReaderLine(direction: 1 | -1): void {
  reader.scrollBy({ x: 0, y: direction })
}

function scrollReaderHalfPage(direction: 1 | -1): void {
  const step = Math.max(3, Math.floor(reader.height / 2))
  reader.scrollBy({ x: 0, y: direction * step })
}

function scrollReaderToStart(): void {
  reader.scrollTo({ x: 0, y: 0 })
}

function scrollReaderToEnd(): void {
  reader.scrollTo({ x: 0, y: Math.max(0, reader.scrollHeight - reader.height) })
}

async function refreshDocuments(): Promise<void> {
  const previousId = selectedDocument()?.id
  const nextDocuments = await loadDocuments()
  const preservedIndex = previousId ? nextDocuments.findIndex((document) => document.id === previousId) : -1

  documents = nextDocuments
  selectedIndex = preservedIndex >= 0 ? preservedIndex : clampIndex(selectedIndex, documents.length)
  refreshView()
}

library.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
  setDocumentIndex(index)
})

const disposers = [
  keymap.on("state", refreshHelp),
  keymap.registerLayer({
    commands: [
      {
        name: "app.focus.next",
        title: "Next pane",
        desc: "Move focus to the next pane",
        category: "App",
        run() {
          cycleFocus(1)
        },
      },
      {
        name: "app.focus.previous",
        title: "Previous pane",
        desc: "Move focus to the previous pane",
        category: "App",
        run() {
          cycleFocus(-1)
        },
      },
      {
        name: "app.doc.next",
        title: "Next document",
        desc: "Open the next document",
        category: "Documents",
        run() {
          moveDocument(1)
        },
      },
      {
        name: "app.doc.previous",
        title: "Previous document",
        desc: "Open the previous document",
        category: "Documents",
        run() {
          moveDocument(-1)
        },
      },
      {
        name: "app.docs.refresh",
        title: "Reload documents",
        desc: "Reload the markdown documents",
        category: "Documents",
        run() {
          return refreshDocuments()
        },
      },
      {
        name: "app.help.toggle",
        title: "Toggle help",
        desc: "Show or hide the help overlay",
        category: "App",
        run() {
          showHelp = !showHelp
          refreshView()
        },
      },
      {
        name: "library.select.next",
        title: "Library down",
        desc: "Move down in the library",
        category: "Library",
        run() {
          moveDocument(1)
        },
      },
      {
        name: "library.select.previous",
        title: "Library up",
        desc: "Move up in the library",
        category: "Library",
        run() {
          moveDocument(-1)
        },
      },
      {
        name: "library.select.first",
        title: "First document",
        desc: "Jump to the first document",
        category: "Library",
        run() {
          setDocumentIndex(0)
        },
      },
      {
        name: "library.select.last",
        title: "Last document",
        desc: "Jump to the last document",
        category: "Library",
        run() {
          setDocumentIndex(documents.length - 1)
        },
      },
      {
        name: "reader.page.up",
        title: "Page up",
        desc: "Scroll the reader up",
        category: "Reader",
        run() {
          scrollReaderPage(-1)
        },
      },
      {
        name: "reader.page.down",
        title: "Page down",
        desc: "Scroll the reader down",
        category: "Reader",
        run() {
          scrollReaderPage(1)
        },
      },
      {
        name: "reader.line.up",
        title: "Line up",
        desc: "Scroll the reader up one line",
        category: "Reader",
        run() {
          scrollReaderLine(-1)
        },
      },
      {
        name: "reader.line.down",
        title: "Line down",
        desc: "Scroll the reader down one line",
        category: "Reader",
        run() {
          scrollReaderLine(1)
        },
      },
      {
        name: "reader.half.up",
        title: "Half page up",
        desc: "Scroll the reader up half a page",
        category: "Reader",
        run() {
          scrollReaderHalfPage(-1)
        },
      },
      {
        name: "reader.half.down",
        title: "Half page down",
        desc: "Scroll the reader down half a page",
        category: "Reader",
        run() {
          scrollReaderHalfPage(1)
        },
      },
      {
        name: "reader.top",
        title: "Reader top",
        desc: "Jump to the top of the reader",
        category: "Reader",
        run() {
          scrollReaderToStart()
        },
      },
      {
        name: "reader.bottom",
        title: "Reader bottom",
        desc: "Jump to the bottom of the reader",
        category: "Reader",
        run() {
          scrollReaderToEnd()
        },
      },
      {
        name: "app.quit",
        title: "Quit",
        desc: "Exit the markdown reader demo",
        category: "App",
        run() {
          renderer.destroy()
        },
      },
    ],
  }),
  keymap.registerLayer({
    bindings: [
      { key: "tab", cmd: "app.focus.next", desc: "Next pane" },
      { key: "shift+tab", cmd: "app.focus.previous", desc: "Previous pane" },
      { key: "n", cmd: "app.doc.next", desc: "Next document" },
      { key: "p", cmd: "app.doc.previous", desc: "Previous document" },
      { key: "r", cmd: "app.docs.refresh", desc: "Reload documents" },
      { key: "?", cmd: "app.help.toggle", desc: "Help" },
      { key: "f1", cmd: "app.help.toggle", desc: "Help" },
      { key: "q", cmd: "app.quit", desc: "Quit" },
      { key: "ctrl+q", cmd: "app.quit", desc: "Quit" },
    ],
  }),
  keymap.registerLayer({
    target: library,
    targetMode: "focus",
    bindings: [
      { key: "j", cmd: "library.select.next", desc: "Next document" },
      { key: "k", cmd: "library.select.previous", desc: "Previous document" },
      { key: "gg", cmd: "library.select.first", desc: "First document" },
      { key: "shift+g", cmd: "library.select.last", desc: "Last document" },
    ],
  }),
  keymap.registerLayer({
    target: reader,
    targetMode: "focus",
    bindings: [
      { key: "j", cmd: "reader.line.down", desc: "Scroll down" },
      { key: "k", cmd: "reader.line.up", desc: "Scroll up" },
      { key: "ctrl+d", cmd: "reader.half.down", desc: "Half page down" },
      { key: "ctrl+u", cmd: "reader.half.up", desc: "Half page up" },
      { key: "pageup", cmd: "reader.page.up", desc: "Page up" },
      { key: "pagedown", cmd: "reader.page.down", desc: "Page down" },
      { key: "gg", cmd: "reader.top", desc: "Top" },
      { key: "shift+g", cmd: "reader.bottom", desc: "Bottom" },
    ],
  }),
]

renderer.on("destroy", () => {
  for (const dispose of disposers) {
    dispose()
  }

  markdownSyntaxStyle.destroy()
})

refreshView()

if (isTestMode()) {
  setTimeout(() => {
    renderer.destroy()
  }, 500)
}
