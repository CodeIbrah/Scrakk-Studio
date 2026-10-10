---
title: "Tool dock"
group: features
order: 210
summary: "The floating horizontal pill of tool buttons that any panel can mount, its registered items, and how activity-bar buttons dock into it."
---
# Tool dock

The **tool dock** is a floating horizontal pill of buttons that any panel can
opt into. It looks like the activity bar laid on its side: clicking a button
opens a floating panel that grows upwards from the pill. Nothing is hard-coded —
buttons and their panels are declared in a registry and each one states which
hosts it appears in.

```tsx
import { ToolDock, ToolDockHostProvider } from '@features/tooldock'

<ToolDockHostProvider hostId="explorer">
  <ToolDock />
</ToolDockHostProvider>
```

The Explorer is the only built-in host today
(`features/explorer/ExplorerPanel.tsx`, `hostId="explorer"`).

## Registering an item

Items go through `registerToolDockItem` (`features/tooldock/registry.ts`). A
`ToolDockItem` is:

| Field | Meaning |
|---|---|
| `id` | Unique id, feature-prefixed |
| `kind` | `'button'` (immediate action) or `'panel'` (floating panel) |
| `title` | Tooltip / aria-label |
| `icon` | `ProductIcon` id (no raw SVGs) |
| `order` | Position in the dock, ascending (default `100`) |
| `hosts` | `string[]` of hostIds or a predicate over `ToolDockHostInfo` |
| `component` | `kind: 'panel'` content, receives `{ hostId, currentFile }` |
| `onActivate` | `kind: 'button'` click handler |

An item with no `hosts` (or an empty array) appears **nowhere** until a host
matches, so registering an item never leaks it into every panel.

`getToolDockItemsForHost(ctx)` filters by `hosts` and sorts by `order`
(ascending), falling back to `id` for ties. `unregisterToolDockItem(id)` removes
an item; `subscribeToToolDockItems` drives re-renders.

## Built-in items

`features/tooldock/items/index.ts` registers three panels, each scoped to the
`explorer` host:

| Id | Title | Icon | Order |
|---|---|---|---|
| `outline` | Esquema | `code` | 10 |
| `timeline` | Línea de tiempo | `history` | 20 |
| `bookmarks` | Marcadores | `bookmark` | 30 |

`OutlinePanel` resolves symbols from the active file's parser tree first, then
falls back to `services/symbolExtractor`, and clicking a symbol moves the cursor
in that editor. The other panels are covered by [Outline](outline.md),
[File timeline](file-timeline.md) and [Bookmarks](bookmarks.md).

## What the dock renders

The dock builds its entries in two parts
(`features/tooldock/components/ToolDock.tsx`):

1. **Docked activity-bar buttons** — every button whose layout override puts it
   on the `toolDock` side, via `getToolDockedButtons()`. These come first, in the
   bar's order.
2. **Registry items** — `getToolDockItemsForHost(hostInfo)` for the host.

If both are empty, the dock renders `null` and takes no space.

Clicking an activity entry mirrors the activity bar:
`toggleSlotPanel(button.target, button.panelId)`. Clicking an item entry calls
`togglePanel(item.id)` (open, or close if it is already active).

## Interacting with the activity bar

Buttons can be dragged between the left/right bars and the dock. The dock uses
the same drag system as the activity bar: on pointer down it tracks the pointer,
and when the pointer is over a `nav[data-side]` it calls
`moveButton(id, side, index)`, or `moveButton(id, 'toolDock', index)` when over
the `[data-tool-dock]` element. Positions are persisted in
`scrakk-studio:activitybar-layout`, and the activity bar never lists buttons with
the `toolDock` side.

## The floating panel

The panel is rendered through a `createPortal` to `document.body`, anchored above
the pill, so no `overflow: hidden` in the host can clip it. Its width is clamped
to `240–360px` based on the host panel width, and its height is that host's saved
value (default `280`, minimum `120`). A drag handle at the top resizes it live;
the new height is persisted per host as
`scrakk-studio:tooldock:<hostId>:height`. The panel uses `PanelFrame`, so it gets
the normal panel header and close button.

Each host keeps its own state through `ToolDockHostProvider`: the active panel
id, panel height, a 150 ms closing animation, and a `currentFile` derived from
the editor bus (`activePath` + its tab). Items that need the active file receive
it as `currentFile` and re-render only when the active path changes.

## Limits

- The provider is per host and in-memory; only the panel height is persisted, not
  which panel was open.
- Only the Explorer mounts the dock today; making another panel a host means
  wrapping it in `ToolDockHostProvider` and rendering `<ToolDock />`.
- A docked activity button opens the panel it declares in the activity bar; it
  is the same target, not a dock-specific panel.
- Extensions have no tool-dock contribution point yet; items are registered from
  app code.

## Next steps

- [Explorer](explorer.md) — the host panel.
- [Outline](outline.md), [Bookmarks](bookmarks.md), [File timeline](file-timeline.md) — the built-in items.
- [Layout & panels](layout.md) — slots, strips and the panel system.
- [Status bar](status-bar.md) — the other place activity lives.
