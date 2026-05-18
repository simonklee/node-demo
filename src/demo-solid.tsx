import { type ScrollBoxRenderable, type SelectRenderable } from "@opentui/core"
import { registerBaseLayoutFallback } from "@opentui/keymap/addons/opentui"
import { formatCommandBindings } from "@opentui/keymap/extras"
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui"
import { render, useRenderer, useTerminalDimensions } from "@opentui/solid"
import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import {
  clampIndex,
  createDemoRenderer,
  createMarkdownSyntaxStyle,
  focusZones,
  formatDocumentCount,
  getLibraryOptions,
  helpCommands,
  isTestMode,
  keyFormatOptions,
  loadDocuments,
  markdownTableOptions,
  palette,
  type FocusZone,
} from "./demo-shared"

const initialDocuments = await loadDocuments()

const renderer = await createDemoRenderer()
const testMode = isTestMode()

const keymap = createDefaultOpenTuiKeymap(renderer)

registerBaseLayoutFallback(keymap)

function DemoApp() {
  const liveRenderer = useRenderer()
  const terminal = useTerminalDimensions()
  const markdownSyntaxStyle = createMarkdownSyntaxStyle()

  const [documents, setDocuments] = createSignal(initialDocuments)
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [focusZone, setFocusZone] = createSignal<FocusZone>("library")
  const [showHelp, setShowHelp] = createSignal(false)
  const [keymapVersion, setKeymapVersion] = createSignal(0)
  const [libraryRef, setLibraryRef] = createSignal<SelectRenderable>()
  const [readerRef, setReaderRef] = createSignal<ScrollBoxRenderable>()

  const sidebarWidth = 30

  onCleanup(() => {
    markdownSyntaxStyle.destroy()
  })

  createEffect(() => {
    const dispose = keymap.on("state", () => {
      setKeymapVersion((value) => value + 1)
    })
    setKeymapVersion((value) => value + 1)
    onCleanup(() => {
      dispose()
    })
  })

  const selectedDocument = createMemo(() => {
    const items = documents()
    return items[clampIndex(selectedIndex(), items.length)] ?? null
  })
  const screenWidth = createMemo(() => Math.max(80, terminal().width))
  const screenHeight = createMemo(() => Math.max(24, terminal().height))
  const sidebarOpen = createMemo(() => focusZone() === "library")
  const currentSidebarWidth = createMemo(() => (sidebarOpen() ? sidebarWidth : 0))
  const readerWidth = createMemo(() => Math.max(24, screenWidth() - currentSidebarWidth()))
  const commandHints = createMemo(() => {
    keymapVersion()
    return helpCommands
      .map((command) => ({
        ...command,
        keys: formatCommandBindings(
          keymap.getCommandBindings({ visibility: "registered", commands: [command.name] }).get(command.name),
          keyFormatOptions,
        ),
      }))
      .filter((command) => command.keys)
  })
  const libraryOptions = createMemo(() => getLibraryOptions(documents()))
  const setDocumentIndex = (index: number) => {
    const items = documents()
    const nextIndex = clampIndex(index, items.length)

    setSelectedIndex(nextIndex)
  }

  const moveDocument = (direction: 1 | -1) => {
    const items = documents()
    const currentIndex = clampIndex(selectedIndex(), items.length)
    const nextIndex = clampIndex(currentIndex + direction, items.length)

    if (nextIndex === currentIndex) {
      return
    }

    setDocumentIndex(nextIndex)
  }

  const cycleFocus = (direction: 1 | -1) => {
    const currentIndex = focusZones.indexOf(focusZone())
    const nextIndex = (currentIndex + direction + focusZones.length) % focusZones.length
    const nextZone = focusZones[nextIndex] ?? "library"

    setFocusZone(nextZone)
  }

  const scrollReaderPage = (direction: 1 | -1) => {
    const reader = readerRef()
    if (!reader) {
      return
    }

    const step = Math.max(6, reader.height - 4)
    reader.scrollBy({ x: 0, y: direction * step })
  }

  const scrollReaderLine = (direction: 1 | -1) => {
    readerRef()?.scrollBy({ x: 0, y: direction })
  }

  const scrollReaderHalfPage = (direction: 1 | -1) => {
    const reader = readerRef()
    if (!reader) {
      return
    }

    const step = Math.max(3, Math.floor(reader.height / 2))
    reader.scrollBy({ x: 0, y: direction * step })
  }

  const scrollReaderToStart = () => {
    readerRef()?.scrollTo({ x: 0, y: 0 })
  }

  const scrollReaderToEnd = () => {
    const reader = readerRef()
    if (!reader) {
      return
    }

    reader.scrollTo({ x: 0, y: Math.max(0, reader.scrollHeight - reader.height) })
  }

  const refreshDocuments = async () => {
    const previousId = selectedDocument()?.id

    const nextDocuments = await loadDocuments()
    const preservedIndex = previousId ? nextDocuments.findIndex((document) => document.id === previousId) : -1
    const nextIndex = preservedIndex >= 0 ? preservedIndex : clampIndex(selectedIndex(), nextDocuments.length)

    setDocuments(nextDocuments)
    setSelectedIndex(nextIndex)
  }

  createEffect(() => {
    const items = documents()
    setSelectedIndex((index) => clampIndex(index, items.length))
  })

  createEffect(() => {
    const reader = readerRef()
    selectedDocument()?.id

    if (reader) {
      reader.scrollTo({ x: 0, y: 0 })
    }
  })

  createEffect(() => {
    switch (focusZone()) {
      case "library":
        libraryRef()?.focus()
        break
      case "reader":
        readerRef()?.focus()
        break
    }
  })

  createEffect(() => {
    const dispose = keymap.registerLayer({
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
            const nextValue = !showHelp()
            setShowHelp(nextValue)
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
            setDocumentIndex(documents().length - 1)
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
            liveRenderer.destroy()
          },
        },
      ],
    })
    onCleanup(() => {
      dispose()
    })
  })

  createEffect(() => {
    const dispose = keymap.registerLayer({
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
    })
    onCleanup(() => {
      dispose()
    })
  })

  createEffect(() => {
    const target = libraryRef()
    if (!target) {
      return
    }

    const dispose = keymap.registerLayer({
      target,
      targetMode: "focus",
      bindings: [
        { key: "j", cmd: "library.select.next", desc: "Next document" },
        { key: "k", cmd: "library.select.previous", desc: "Previous document" },
        { key: "gg", cmd: "library.select.first", desc: "First document" },
        { key: "shift+g", cmd: "library.select.last", desc: "Last document" },
      ],
    })
    onCleanup(() => {
      dispose()
    })
  })

  createEffect(() => {
    const target = readerRef()
    if (!target) {
      return
    }

    const dispose = keymap.registerLayer({
      target,
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
    })
    onCleanup(() => {
      dispose()
    })
  })

  return (
    <box width={screenWidth()} height={screenHeight()} flexDirection="column" backgroundColor={palette.bg}>
      <box width={screenWidth()} height={screenHeight()} flexDirection="row" backgroundColor={palette.bg}>
        <Show when={sidebarOpen()}>
          <box width={sidebarWidth} height={screenHeight()} paddingX={1} paddingY={1} flexDirection="column" gap={1} backgroundColor={palette.sidebar}>
            <box width="100%" flexDirection="column">
              <text fg={palette.focus}>opentui-node</text>
              <text fg={palette.dim}>{formatDocumentCount(documents().length)}</text>
            </box>

            <select
              ref={setLibraryRef}
              flexGrow={1}
              width="100%"
              options={libraryOptions()}
              selectedIndex={clampIndex(selectedIndex(), libraryOptions().length)}
              onChange={(index) => {
                setDocumentIndex(index)
              }}
              backgroundColor={palette.sidebar}
              textColor={palette.muted}
              focusedBackgroundColor={palette.sidebar}
              focusedTextColor={palette.text}
              selectedBackgroundColor={palette.selection}
              selectedTextColor={palette.selectionMuted}
              descriptionColor={palette.dim}
              selectedDescriptionColor={palette.selectionMuted}
              showDescription={false}
              showScrollIndicator={true}
            />
          </box>
        </Show>

        <box width={readerWidth()} height={screenHeight()} paddingX={2} paddingY={1} flexDirection="column" gap={1} backgroundColor={palette.reader}>
          <box width="100%" height={2} flexShrink={0} flexDirection="column">
            <text width="100%" wrapMode="none" truncate={true} fg={focusZone() === "reader" ? palette.focus : palette.text}>
              {selectedDocument()?.title ?? "No document selected"}
            </text>
            <text width="100%" wrapMode="none" truncate={true} fg={palette.dim}>
              {selectedDocument()?.description ?? "no document"}
            </text>
          </box>

          <scrollbox ref={setReaderRef} flexGrow={1} width="100%" scrollY={true} backgroundColor={palette.reader}>
            <markdown
              width="100%"
              content={selectedDocument()?.content ?? ""}
              syntaxStyle={markdownSyntaxStyle}
              fg={palette.text}
              bg={palette.reader}
              conceal={true}
              internalBlockMode="top-level"
              tableOptions={markdownTableOptions}
            />
          </scrollbox>
        </box>
      </box>

      <Show when={showHelp()}>
        <box
          position="absolute"
          top={2}
          right={4}
          width={58}
          height={16}
          zIndex={20}
          border
          borderStyle="rounded"
          borderColor={palette.focus}
          backgroundColor={palette.overlay}
          padding={1}
          flexDirection="column"
          gap={1}
        >
          <text fg={palette.text}>Help</text>
          <For each={commandHints()}>
            {(command) => (
              <text fg={palette.text}>
                <span fg={palette.warning}>{command.keys}</span>
                <span fg={palette.dim}>  {command.label}</span>
              </text>
            )}
          </For>
          <text fg={palette.dim}>Press ? or F1 to close.</text>
        </box>
      </Show>
    </box>
  )
}

if (testMode) {
  setTimeout(() => {
    renderer.destroy()
  }, 500)
}

await render(() => <DemoApp />, renderer)
