---
title: "Panels & features"
group: features
order: 10
summary: "Index of Scrakk Studio's built-in panels — Explorer, Search, Git and the rest — with what each one covers."
---
# Panels & features

Scrakk Studio's UI is assembled from **panels**: React components the layout
mounts in a slot (left, center, right, bottom) and that the activity bar opens.
This section documents the built-in ones — the panels shipped with the app — and
the features they expose. For the panel system itself (slots, strips, splits,
header actions), see [panels](../extensions/guides/panels.md).

## Built-in panels

The full set of docs in this area:

| Doc | Covers |
|---|---|
| [explorer.md](explorer.md) | Workspace file tree: lazy folders, virtualization, selection, lasso, drag & drop, file-icon themes and git badges |
| [search.md](search.md) | Content grep over the workspace, the result list, and the sidecar/native/TS search chain |
| [git.md](git.md) | Status, branches, staging, changes tree, commit, history, stash, tags, remotes and PRs |
| [browser.md](browser.md) | Browser: the browser panel (a placeholder today; web content comes from extension webviews and the AI web tools) |
| [debug.md](debug.md) | Debug: the debug panel (a placeholder — no debugger yet) |
| [problems.md](problems.md) | Problems: diagnostics from language servers and extensions |
| [notes.md](notes.md) | Notes: the notes panel |
| [terminal.md](terminal.md) | Terminal: integrated terminal sessions |
| [social.md](social.md) | Social: friends, direct messages, presence and profiles |
| [sessions.md](sessions.md) | Live sessions: canvas + engine that survives slot moves |
| [layout.md](layout.md) | Layout & panels: slots, strips, splits and the panel system |
| [shortcuts.md](shortcuts.md) | Shortcuts & commands: keybindings and the command palette |
| [settings.md](settings.md) | Settings: app configuration |
| [themes.md](themes.md) | Themes & icons: color themes, file icons and UI icons |

## How a panel mounts

Every built-in panel is registered in `PANEL_REGISTRY`
(`src/renderer/src/features/layout/registry.tsx`) with an **id**, an i18n
**title** and a **dynamic import**; `PanelHost` mounts it inside its own error
boundary, so a crashing panel only shows its own error. The Explorer and the Chat
are permanent (`closable: false`); the rest are closable tabs.

Panel actions are `HeaderActionButton`s with namespaced ids (`explorer.refresh`,
`git.new-branch`); that id is what the layout persists to remember the user's
button order. Extension-contributed panels go through the same lookup
(`getPanel(id)`), so built-in and extension panels are mounted identically.

## Opening a panel

Panels open from the **activity bar**: each button targets a panel id (or a slot
plus id). The layout mounts the panel into a strip and persists the arrangement,
so a panel the user moved or closed comes back on the next launch.
`toggleSlotPanel(slot, panelId)` is the programmatic entry point used by commands
such as `git.panel` (`mod+shift+g`).

## Next steps

- [Panels](../extensions/guides/panels.md) — the panel contract, slots and header actions.
- [Explorer](explorer.md) — the workspace file tree.
- [Search](search.md) — grep the workspace.
- [Git](git.md) — source control and the changes tree.
- [Extensions](../extensions/README.md) — packages that contribute panels.
