---
title: "Center tabs"
group: extensions
order: 60
summary: "A tab in the editor's center strip: what it registers, how it opens and where its icon comes from."
---
# Center tabs

A **center strip tab** (the editor one). It registers a **panel** with the same
`id` at the same time, so the content is mounted with the same `PanelHost` and
`ErrorBoundary` as any panel.

```json
{
  "centerTabs": [
    {
      "id": "acme-dashboard",
      "label": "Dashboard",
      "icon": "icons/acme.tsx",
      "closable": true,
      "component": "tabs/Dashboard.tsx"
    }
  ]
}
```

| Field | Type | Required |
|---|---|---|
| `id` | string (global) | yes |
| `label` | string | yes |
| `icon` | module (`export default` = `{size?}` component) | no |
| `closable` | boolean | no |
| `component` | path to a module | yes |

## What it registers

1. A **panel** with `id` = the tab's id (dynamic import of the `component`).
2. A **tab entry** (`label` + resolved icon) in the registry.

The tab's `id` **is** the panel's `id`. The tab icon is resolved from `centerTabs`
when the strip paints it.

## How it shows up

The tab lives in the **center** and is mounted when something spawns that `id`
there (for example, an IDE command that opens the panel, or a flow that calls
`openPanelTab('center', id)`). Unlike an activity bar button, a `centerTabs` entry
does **not** open by itself: it declares the panel and its tab metadata.

## Rules

- The `component` must be in the bundle: `centerTabs[].component` (and
  `centerTabs[].icon`) are code paths `sef build` collects.
- The `id` is global (it cannot clash with another panel/tab).

## Next steps

- [Panels](panels.md) — the component that gets mounted.
- [Views](views.md) — if you want the content served by code (host).
