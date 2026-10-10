---
title: "The editor"
group: editor
order: 50
summary: "The editor experience on top of Innerta: one shared WASM engine per pane with N file sessions, file tabs and splits, minimap, bookmarks, cursor, zoom and the document/session model."
---
# The editor

The editor host is **Innerta**, a C++ engine compiled to WASM. What you see as
"the editor" is mostly Scrakk's UI around it: the tab system, the per-pane
engine, the session store, the minimap setting, bookmarks and the cursor bus.

The engine is one **render surface** per pane. The UI, the data and the state
belong to Scrakk (see [innerta-bridge.md](innerta-bridge.md)).

## 1. The engine-per-panel model

There is no WASM module per file. Each **pane** (a strip in `left`, `center`,
`right`, `bottom`) owns one isolated `InnertaEngine` (its own WASM module, canvas
and GL context). Every open file inside that pane is a **session** of that
module, holding its complete state: text, undo, cursor, scroll and folds.

`features/editor/engine.ts` is the factory:

```ts
getOrCreatePaneEngine(paneId)   // one InnertaEngine({ isolated: true }) per pane
listPaneEngines()               // live engines (memory metrics)
releasePaneEngineIfEmpty(paneId) // destroys the module when its last session closes
```

Changing tabs is `activateFileSession(path)`: instant, and it loses nothing. The
old model (one module per file) evicted sessions when the module cap was hit and
threw the undo away; that is gone. An isolated module is mandatory because the
non-isolated loader (`getInnertaModule`) is a singleton with one global canvas —
two panes would share it and the second would stay blank.

## 2. File tabs and splits

Two stores cooperate:

- `features/editor/editorBus.ts` — `openFiles` + `activePath`, persisted in
  localStorage. `openFileInEditor(path, name)` is the single entry point the rest
  of the app calls to open a file; `closeFile`, `activateFile`, `moveFileTab` and
  `reorderOpenFilesTo` mutate it.
- `features/tabs/store.ts` — `tabsStore` is the generic tab system. A strip is a
  string id; `TabSpec` has a `kind` (`welcome | panel | file | terminal | explorer`).
  Helpers build specs: `fileTab(filePath, name)`, `panelTab(panelId)`,
  `terminalTab(sessionId)`, `welcomeTab()`.

The file tabs in the center are **derived** from `editorBus`, not a second truth.
`features/layout/actions.ts` runs `reconcileFileTabs()` on every bus change:

- a `file:` tab whose path is no longer open is closed and its session destroyed;
- every open file without a tab is spawned in `center` (unless the center was
  hidden by the user);
- `activePath` is activated in its strip.

Splits are an independent tree per slot (`features/layout/splitTree.ts`):

```ts
splitTreeStore.splitStrip(stripId, edge) // turns a leaf into a split + a new strip
splitTreeStore.setRatio(splitId, ratio)  // the handle between the two sides
splitTreeStore.removeStrip(stripId)      // collapses the split to its sibling
```

A leaf references a strip; dropping a tab on an edge creates a new (empty) strip
and moves the tab there. `StripState.splitDir` is the older per-strip split
(`'row' | 'column'`) and still renders one panel per tab when set.

### Virtual tabs

`features/editor/virtualTabs.ts` (`openVirtualTab(handlerId, payload, title)`)
opens a tab for content that is not a file: the path is
`scrakk-view://<id>/<payload>`, it travels through the same `editorBus`, and the
file-handler registry resolves it **by id** — the same viewer works inside a chat
card and as a first-class tab.

## 3. The document/session model (`fileSession`)

`features/editor/fileSession.ts` exposes one `FileSession` per path
(`getFileSession(path)`), cached in a module-level `Map`. The session:

- `attach(host, paneId)` grabs (or creates) the pane's engine and
  `createFileSession` / `activateFileSession` for this path;
- reads content from **provided content** first (diff tabs), then from disk via
  `readEncoded` + `setDetected`, then calls `lspNotifyFileChanged`;
- tracks **dirty** through the engine revision (`markClean(revision)` on save)
  and emits `onDidChangeDirty` / `onDidChangeContent`;
- `detach` is a visual pause (state stays in the engine session); `destroy` drops
  the session and releases the pane engine if it was the last one.

`getFileSessionText(path)` is what `save.ts` encodes and writes (`file.save`,
`mod+s`). `closeGuard.ts` (`requestCloseFile`) blocks a dirty close and offers
"Save and close" / "Close without saving" as notification actions.

## 4. Minimap

A global, persisted setting (`MINIMAP_SETTING_KEY = 'scrakk-editor-minimap'`):
`getMinimapVisible()` reads it (default `true`) and
`setMinimapVisibleEverywhere(visible)` persists it and broadcasts
`MINIMAP_EVENT`. Every live engine listens to `'innerta-minimap-changed'` and
re-applies `module.setMinimapVisible(visible)` (also on connect). The palette
entry is `view.toggleMinimap`; Settings → Editor has the same toggle
(`EditorSection`).

## 5. Bookmarks

`services/bookmarks/index.ts` is the source of truth (`scrakk-studio:bookmarks`,
keyed by path → sorted line numbers). It is the one gutter marker with a full
cycle:

- the host pushes lines with `module.setBookmarks(getBookmarksForPath(path))`;
- clicking the gutter in the engine emits `BookmarkToggled` on the single C++
  channel, and `hostBridge` mirrors it with `applyEngineBookmark(path, line, on)`;
- the re-push is idempotent. The ToolDock **Bookmarks** panel lists every file
  and jumps with `openFileInEditor`.

## 6. Cursor

`features/editor/cursorBus.ts` is a singleton store. The engine pushes
`CursorChanged(a, b)` (0-based line/col) through `_innertaOnEvent`; `hostBridge`
calls `setEditorCursor({ line, col })`. It also refreshes on tab activation with
`syncCursor()` (`getCursor()`), because the engine emits only for the active
file. The status bar subscribes and renders the human 1-based `Ln X, Col Y`
(`cursorBus` keeps 0-based, the UI adds 1).

## 7. Zoom

Zoom **is** the engine's font size, not a CSS transform (changing the font
re-rasterizes the glyphs and stays crisp; `scale()` would blow up the bitmap).
The engine's own `Ctrl +/-` and `Ctrl+wheel` move it; the host exposes the same
value via `module.setFontSize(px)` (`_SetInnertaFontSize`) and
`module.getFontSize()` (`_GetInnertaFontSize`, `-1` if the build lacks it).
There is no host-side zoom command or Settings slider today; only the terminal
session drives `setFontSize` from its own scale.

## 8. Limits

| What | Status |
| --- | --- |
| N sessions per pane, full undo/cursor/scroll/folds | ✅ |
| File tabs derived from `editorBus`; splits per slot | ✅ |
| Minimap global toggle (command + Settings) | ✅ |
| Bookmarks store + gutter round-trip + panel | ✅ |
| Cursor bus (`Ln/Col` live) | ✅ |
| Editor **zoom UI** (Settings/slider/command) | ❌ only the engine's own `Ctrl +/-` / wheel; `setFontSize` is used by the terminal |
| Move a tab between panes | 🟡 carries text but **loses that session's undo** (documented in `fileSession.attach`) |
| One engine per pane | 🟡 RAM scales with visible panes, not open files |

## Next steps

- [Editor decorations — range underlines](decorations.md): the engine channel
  that paints diagnostics and `editor.setDecorations`.
- [Innerta as a surface, Scrakk as the owner of the UI](innerta-bridge.md): the
  bridge inventory and the geometry `S1` that text-anchored UI needs.
- [Diff tabs](diff.md): a read-only file tab with provided content and
  background decorations.
- [Editor screenshots](screenshots.md): verifying that the editor really paints.
- [LSP docs](../lsp/README.md) and [extensions docs](../extensions/README.md).
