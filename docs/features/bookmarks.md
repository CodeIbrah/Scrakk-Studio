---
title: "Bookmarks"
group: features
order: 290
summary: "Toggle a bookmark on a line from the editor gutter, the persistent store behind it, and the Bookmarks tool-dock panel."
---
# Bookmarks

A **bookmark** marks a line of a file so you can come back to it. The renderer is
the source of truth and persists the list; the Innerta engine only receives the
lines to draw a `bookmark` icon in the gutter and to detect clicks on it. The
Bookmarks panel lists every marked file.

## The store

`@services/bookmarks` keeps a `Record<path, number[]>` of **0-based** line
numbers, persisted in `localStorage` under `scrakk-studio:bookmarks`:

```ts
toggleBookmark(path, line): boolean     // flips, returns the new state
applyEngineBookmark(path, line, on)     // set/clear from the engine gutter
getBookmarksForPath(path): number[]     // copy, sorted
getAllBookmarks(): Record<string, number[]>
setBookmarksForPath(path, lines)        // programmatic set (dedup + sort)
subscribeToBookmarks(listener): () => void
```

Any mutation persists, emits to in-process listeners and dispatches the
`scrakk-bookmarks-changed` `CustomEvent` (`BOOKMARKS_EVENT`). Empty lists drop
the path entry.

## Toggling from the editor

The engine owns the gutter. Clicking there emits `BookmarkToggled` on the single
C++ event channel; `hostBridge.ts` mirrors it into the store:

```ts
case InnertaHostEvent.BookmarkToggled: {
  if (activePath && Number.isFinite(a) && a >= 0) {
    applyEngineBookmark(activePath, a, b === 1)
  }
}
```

The host pushes the other direction with `module.setBookmarks(getBookmarksForPath(path))`.
`InnertaEngine` subscribes to the store and re-pushes on change, so the cycle is
idempotent. The pointer marshalling (`innertaLoader.ts`) uses `malloc` + `HEAP32`
+ `free`, because passing a JS array where the C export expects a pointer coerces
to `NULL`.

## The Bookmarks panel

The **Bookmarks** tool-dock item (`features/tooldock/items/bookmarks`) is
registered with:

| Field | Value |
|---|---|
| `id` | `bookmarks` |
| `title` | `t('features.marcadores')` |
| `icon` | `bookmark` |
| `order` | 30 |
| `hosts` | `['explorer']` |

It groups bookmarks by file (files sorted by path, lines ascending). Each line is
a button that calls `openFileInEditor(path, baseName(path))`, and an
`IconButton` with a close icon calls `toggleBookmark(path, line)` to remove it.
The empty state is `features.sin.marcadores.click.derecho.sobre`.

## Limits

- Toggling is done from the **gutter click in the engine**; there is no command
  in the palette and no keybinding registered for it.
- The empty-state text suggests a right click, but the editor context menu
  (`editorContextMenu.tsx`) only offers Copy / Paste / Select all. There is no
  right-click "toggle bookmark" item today.
- The panel lists all files at once; it has no per-file filter or ordering.
- The store is global to the app (one `localStorage` key), not per workspace.
- Only the Explorer hosts the dock, so the panel is reachable from there.

## Next steps

- [Tool dock](tool-dock.md) — the pill that hosts the panel.
- [File timeline](file-timeline.md) and [Outline](outline.md) — the sibling items.
- [The editor](../editor/editor.md) — the gutter, cursor and host bridge.
- [Layout & panels](layout.md) — where the Explorer mounts the dock.
