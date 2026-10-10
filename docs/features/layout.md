---
title: "Layout & panels"
group: features
order: 120
summary: "How the app is laid out: four resizable slots, a split tree of tab strips per slot, the panel system and the activity bar."
---
# Layout & panels

The app's shell is a **four-slot layout** (left, center, right, bottom) that is
fully resizable, splittable and persistent. Everything the user sees is a
**panel**: a React component the layout mounts in a slot.

## Slots

| Slot | Typical content |
|---|---|
| `left` | Explorer, Search |
| `center` | The editor (file tabs, welcome) |
| `right` | Chat, Git, Notes, Social |
| `bottom` | Terminal, Problems, Debug, Browser |

Each slot can be **resized** (a `ResizeHandle` on its edge) and **hidden**; the
sizes and which slots are open are persisted.

## Inside a slot: the split tree

A slot is not a single strip —it is a **split tree**
(`features/layout/splitTree`). A leaf is a **strip** (a group of tabs with its own
`TabStrip`); a node is a horizontal/vertical split with a ratio. So the center can
show two editors side by side, each with its own tab bar.

The **tabs** themselves live in `@features/tabs` (an external store): strips by
id, each with its tabs, active tab and (optional) content split. Tabs are
activated/closed/moved through `activateTabSmart` / `closeTabSmart` and can be
dragged between strips.

## The panel system

A **panel** is registered with an id, a title and a lazy loader:

```ts
// register (built-in)
panel('notes', 'layout.panel.notes', () => import('./panels/NotePanel/NotePanel').then((m) => m.NotePanel))
```

`getPanel(id)` resolves built-in panels from `PANEL_REGISTRY` and extension panels
from the `ExtensionRegistry`. `PanelHost` mounts the chosen panel **inside its own
`ErrorBoundary`** (a panel that crashes shows the error, the rest of the app keeps
running). Loaders use dynamic `import()`, **not** `React.lazy`: with no `Suspense`
boundary a `lazy` that suspends never remounts when the module arrives (see the
comment in `registry.tsx`).

Extension panels come from `contributes.panels` / `contributes.views`; see
[Panels](../extensions/guides/panels.md).

## The activity bar

The left/right bars hold **buttons** that toggle a panel in a slot. Buttons are
built-in (`buttons/<id>/index.ts`) and extension-contributed, can be **dragged to
reorder** (and moved between bars), and there is a tool dock for extra actions.
See [Activity bar](../extensions/guides/activity-bar.md).

## Docking the tab strip

The center's horizontal tab strip can be **docked into a side panel** (a vertical
list) instead of sitting above the content. The strip has a dock action (a
`StripAction`), and once docked a normal activity bar button opens the `tabs`
panel. This is the app's own example of the panel/action APIs.

## Chrome

- **Titlebar**: menu, window controls.
- **Statusbar**: left/right chips; extension status-bar items join here; the
  Problems chip opens the [Problems](problems.md) panel.

## Limits

- A slot hosts a split tree, but panels don't float: everything is docked.
- One panel per id per slot layout; the same panel can be opened in different
  strips.

## Next steps

- [Panels & features](README.md) — the panels you can mount.
- [Panels](../extensions/guides/panels.md) — building a panel (extension).
- [The editor](../editor/editor.md) — the center slot's content.
