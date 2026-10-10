---
title: "Breadcrumbs"
group: features
order: 200
summary: "The path bar above the editor: how it resolves the workspace root and file, what each segment shows, and its click dropdowns."
---
# Breadcrumbs

**Breadcrumbs** are the path strip shown above the editor content
(`features/breadcrumbs/BreadcrumbsBar.tsx`). It reads `root > folder > … > file`,
renders each segment with its icon, and lets a click open the Explorer listing
for that level.

The editor mounts one per file tab:

```tsx
// features/layout/components/TabContentView/TabContentView.tsx
<BreadcrumbsBar key={`crumbs-${spec.id}`} path={spec.filePath} />
```

## Props

| Prop | Default | Meaning |
|---|---|---|
| `root` | workspace root | Context root for the path |
| `path` | active editor file | File to show |
| `interactive` | `true` | `false` renders read-only segments (dropdowns disabled) |
| `onNavigate` | `openFileInEditor` | Called with `(path, name)` when a file is picked |
| `showIcons` | `true` | Show per-segment icons |

When `root` or `path` is not passed, the component falls back to its hooks.
`useWorkspaceRoot` reads `scrakk-studio:root-path` from local storage and updates
on the `workspace-changed` event (using `detail.path`); `useActivePath` follows
`getEditorFiles().activePath` through `subscribeToEditorFiles`.

## How the path is built

`buildSegments(root, filePath)` (`features/breadcrumbs/segments.ts`) is a pure
function, testable without React:

- No file → empty list (the bar renders `null`).
- No root, or a file **outside** the root → a single segment with the file's
  base name.
- Inside the root → a root segment (`isRoot: true`) named after the root folder,
  then one segment per path part; the last is marked `isFile`.
- Paths are normalised: backslashes become `/`, trailing slashes are trimmed.

Each `CrumbSegment` has `name`, `path`, `isFile` and `isRoot`.

## Rendering

The bar is a `<nav>` with each segment separated by a `chevron-right` icon. The
icon depends on the segment kind:

- root → `folder-opened`
- folder → `folder`
- file → `FileTypeIcon` (the same file-icon theme used by the
  [Explorer](explorer.md))

The active file segment uses the `segmentFile` style. The button's `title` is the
full absolute path.

## Click behaviour

Clicking a segment calls `openLevel`:

1. It computes the directory to list — the segment path itself for a folder, or
   the parent directory for a file.
2. It opens an anchored modal under `key: 'breadcrumbs-level'` with
   `placement: 'below'`, `align: 'center'` and `width: 300`.
3. The modal renders `ExplorerView` for that directory with `interactive={false}`.
4. Selecting a file calls `navigate(path, name)` (default `openFileInEditor`)
   then closes the dropdown.

Clicking the **same** level again toggles it closed; clicking a different level
closes the previous dropdown and opens the new one. When `interactive` is
`false`, the buttons are disabled and no dropdown opens.

## Limits

- The bar reflects the workspace root from local storage; a file outside that
  root collapses to a single file segment with no intermediate folders.
- The dropdown is a read-only Explorer view: it opens files, but there is no
  rename/new-file/context-menu action inside it.
- Breadcrumbs are not exposed as a setting; there is no per-file "symbol
  breadcrumbs" mode.
- The strip is part of the editor tab view, so it disappears when the tab is not
  the centre content.

## Next steps

- [Explorer](explorer.md) — the file tree behind the dropdowns.
- [Layout & panels](layout.md) — where the editor tab view is mounted.
- [File timeline](file-timeline.md) — a related per-file view in the tool dock.
- [Panels & features](README.md) — the other built-in areas.
