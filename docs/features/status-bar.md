---
title: "Status bar"
group: features
order: 160
summary: "The bottom bar: built-in chips (Problems, Git, LSP, cursor, encoding), the layout toggles, and the extension status-bar items mixed in."
---
# Status bar

The **status bar** is the strip pinned to the bottom of the window. It is not a
panel: the app shell mounts it once (`features/statusbar/StatusBar.tsx`) and it
cannot be moved or closed. It reports the active document, source-control and
language-server state, opens the [Problems](problems.md) panel, and hosts the
status-bar items that extensions create with `window.createStatusBarItem`.

The component receives one prop, `onOpenSettings`, used by the Settings gear.

## Layout

Three regions:

- **Left group**: `LspChip`, `ProblemsChip`, `GitChip`, a separator,
  `CursorPosition`, `EncodingChip`, then `ExtensionItems alignment="left"`.
- **Centre**: the floating `SearchBar` command-palette trigger. It is absolutely
  positioned so the left chips do not push it off centre.
- **Right group**: `ExtensionItems alignment="right"`, `LayoutToggles`, a
  separator, the notifications bell, and the Settings gear.

## The Problems chip

`ProblemsChip` reads `countProblems()` from `@services/lsp/diagnosticsStore`
and re-renders on `subscribeToDiagnostics`. The same store feeds the Problems
panel, so the chip and the panel cannot disagree.

`ProblemCounts` has `errors`, `warnings`, `infos` and `total`; `countProblems`
buckets every diagnostic by severity (`1` error, `2` warning, everything else
info). When both errors and warnings are zero the chip renders in its `clean`
state but still shows `0 · 0`, which is a deliberate "nothing to report".

Clicking it toggles the panel, exactly like VS Code:

```ts
// features/statusbar/components/ProblemsChip/ProblemsChip.tsx
onClick={() => toggleSlotPanel('bottom', 'problems')}
```

The tooltip is built as `N errores · N advertencias · N de información`, e.g.
`3 errores · 1 advertencia · 2 de información`.

## Other built-in chips

- **LSP** (`LspChip`): aggregates `lspStatus()` with `aggregateServerState` and
  refreshes on `onLspServerEvent`. The dot colour follows the aggregate state
  (`idle`, `ready`, `starting`, `retrying`, `failed`). Click opens
  `openSettingsModal('servers')`.
- **Git** (`GitChip`): hidden when there is no active repo. It triggers
  `detectRepos(root)` (root read from `scrakk-studio:root-path`) and subscribes
  to `subscribeToGit`. A green dot means clean, amber means staged/unstaged/
  untracked changes; `↑n`/`↓n` show ahead/behind. Click toggles the Git panel.
- **Cursor** (`CursorPosition`): subscribes to `subscribeToEditorCursor` and
  `subscribeToEditorFiles`. It is hidden when no file is open, and adds `1` to
  the 0-based bus coordinates. Shows `Ln —, Col —` when there is no cursor.
- **Encoding** (`EncodingChip`): reads `getDocumentEncoding(activePath)` and
  labels built-ins (`UTF-8`, `UTF-8 BOM`, `UTF-16 LE`, …) plus `· CRLF` when the
  line ending is CRLF. Click opens a picker via `pickOption` to reopen the file
  with another encoding; the choice is applied with `setDetected` +
  `reloadFileContent`.

## Layout toggles

`LayoutToggles` renders four buttons (left, bottom, centre, right). Each is a
**slot visibility** toggle, not a panel toggle:

```ts
function toggleSlot(slot: SlotId): void {
  if (isSlotOpen(slot)) setSlotPanel(slot, null)
  else toggleSlotPanel(slot, DEFAULT_PANELS[slot] as never)
}
```

`DEFAULT_PANELS` is `{ left: 'explorer', center: 'welcome', right: 'chat',
bottom: 'innerta-terminal' }`. State comes from the real layout store
(`isSlotOpen`), so an open-but-empty slot still reads as active. See
[Layout & panels](layout.md).

## Left and right actions

The bell button opens the notification history as an anchored modal
(`showAnchoredModal({ key: 'notifications-history', render: () =>
<NotificationsHistoryPanel /> })`). The gear button calls `onOpenSettings`. See
[Notifications](notifications.md).

## Extension status-bar items

Extensions call `window.createStatusBarItem(alignment, priority, id)`. The main
process stores the item and pushes a `status/item` payload to the renderer; the
renderer store is `services/extensions/statusBar.ts`. `ExtensionItems` renders
everything whose `visible` is `true` for its `alignment`.

`StatusBarItemModel` (in `@shared/extensionHost/protocol`) carries `id`,
`extensionId`, `alignment`, `priority`, `text`, `tooltip`, `command`, `color`,
`backgroundColor`, `name`, `visible` and an optional `icon` split out of the VS
Code `$(codicon)` prefix. Ordering inside each group is **descending priority**:

```ts
list(alignment) {
  return [...this.items.values()]
    .filter((item) => item.visible && item.alignment === alignment)
    .sort((a, b) => b.priority - a.priority)
}
```

Clicking an item runs `extensionStatusBar.activate(id)`: first
`runCommand(command)` through the IDE registry, and if the IDE does not know it,
the owning extension host's `executeCommand`. An item with no `command` is
rendered `disabled`.

`window.setStatusBarMessage(text, timeoutOrThenable)` is not a separate item: it
reuses one item per extension (`<extensionId>#message`) at left alignment and
priority `-1`, and the last message wins. A numeric timeout or a thenable
removes it; otherwise it stays until disposed.

When an extension host dies or is deactivated, `dropExtension(extensionId)`
removes every item it owned. Text/tooltip/command updates are debounced 40 ms so
a counter that writes every frame does not flood IPC; `show()`/`hide()` flush
immediately.

## Limits

- Built-in chip order is fixed in `StatusBar.tsx`; the user cannot reorder them.
  Only extension items are ordered by priority.
- An extension item is invisible until its `show()` arrives and is dropped when
  its host exits; there is no persistence across reloads.
- `setStatusBarMessage` is one slot per extension, so two concurrent messages
  from the same extension overwrite each other.
- Colours are display-only; the chip inherits theme colours and does not get a
  per-item custom palette in the bar.

## Next steps

- [Layout & panels](layout.md) — slots, strips and the panel system.
- [Problems](problems.md) — the panel the Problems chip opens.
- [Notifications](notifications.md) — the bell and the notification centre.
- [Tool dock](tool-dock.md) — the floating dock used inside panels.
