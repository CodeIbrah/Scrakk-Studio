---
title: "Activity bar"
group: extensions
order: 50
summary: "The side-bar button that opens (or closes) a panel, with its icon declared as a module."
---
# Activity bar

A **button** in the side bar that activates/deactivates a panel. In practice it is
used together with a `panels` entry (the button opens the panel).

```json
{
  "activityBar": [
    {
      "id": "acme-btn",
      "label": "Acme",
      "icon": "icons/acme.tsx",
      "side": "left",
      "target": "left",
      "panelId": "acme-board",
      "order": 50
    }
  ]
}
```

| Field | Type | Required | Note |
|---|---|---|---|
| `id` | string | yes | Button id |
| `label` | string | yes | Tooltip / `aria-label` |
| `icon` | module (`export default` = `{ size?: number }` → JSX) | yes | |
| `side` | `left` \| `right` | yes | The bar it lives in |
| `target` | `SlotId` | yes | The panel's slot (in practice = `side`) |
| `panelId` | string | yes | The panel it opens |
| `order` | number | no | Ascending order within the bar |

## The icon

The `icon` is **not** a proicon id: it is a path to a **module** in the package
whose `export default` is a component that takes `{ size?: number }`. For the
button, prefer an SVG with `currentColor` (so it follows the theme).

```tsx
export default function AcmeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="…" />
    </svg>
  )
}
```

## Behavior

- Clicking the button **toggles** the panel: if it is already on that side, it
  closes it; if not, it opens it. The button stays highlighted while the panel is
  active.
- Buttons can be **dragged** to reorder (and move between bars), like the builtins.
- Extension buttons do **not** accept `when` today (the schema does not declare
  it): they cannot be hidden conditionally from the manifest.

## Rules

- `panelId` must correspond to a real panel (from your own `panels` or a builtin).
  If it does not exist, the button opens an empty panel.
- The `icon` must exist in the **bundle**: `sef build` includes it because
  `activityBar[].icon` is one of the code paths it collects.

## Next steps

- [Panels](panels.md) — the panel the button opens.
- [Contributes](../reference/contributes.md) — the rest of the kinds.
