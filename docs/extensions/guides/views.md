---
title: "Views (with code)"
group: extensions
order: 70
summary: "Activity bar panels whose content is served by the Extension Host (webview or tree), declared with views."
---
# Views (with code)

A **view** is an activity bar panel whose content does **not** come from the React
bundle, but from the **Extension Host**: the extension runs code and serves its
content. It is the declarative door of the "with code" model — the IDE knows the
panel exists **before** running anything.

To declare `views`, the manifest also needs a `runtime` (the VSIX pipeline writes
it; see [Extension Host](../architecture/extension-host.md)):

```json
{
  "contributes": {
    "views": [
      {
        "id": "acme.tasks",
        "name": "Tasks",
        "container": "acme.sidebar",
        "containerTitle": "Acme",
        "iconSvg": "<svg …></svg>",
        "order": 10,
        "welcome": [
          { "contents": "No tasks.\n[Create](command:acme.create)", "when": "acme.empty" }
        ]
      }
    ]
  }
}
```

## Fields

| Field | Type | Required | Note |
|---|---|---|---|
| `id` | global string (`publisher.ext.view`) | yes | |
| `name` | string | yes | Panel title |
| `container` | string | yes | The **container** id = the activity bar button |
| `containerTitle` | string | no | Button/container title |
| `iconSvg` | string (inline SVG) | no | Painted with `currentColor` |
| `order` | number | no | Order in the bar |
| `when` | `when` clause | no | If false, the view is not shown |
| `welcome` | `[{ contents, when? }]` | no | What to show when empty (`viewsWelcome`) |
| `collapsed` | boolean | no | Starts collapsed |
| `hidden` | boolean | no | Starts hidden |

## Container and several views

Several views with the **same `container`** share **one** button and **one**
panel: they stack as collapsible sections (just like VS Code). If **all** views of
a container end up hidden (`when`), the button is not shown either.

## How it serves content

The extension registers, in its `activate`, one of two providers:

- **Webview**: `window.registerWebviewViewProvider(viewId, provider)` — the
  extension publishes HTML and the IDE shows it in an **isolated iframe** (the
  `scrakk-ext://` scheme, with the `acquireVsCodeApi` shim).
- **Tree**: `window.registerTreeDataProvider(viewId, provider)` (or
  `createTreeView`) — the IDE asks for nodes on demand and the click runs the
  item's command with its real arguments.

The IDE does **not** guess the type: it asks the host
(`hostManager.resolveView` → `view/resolve`), and the extension answers `webview`
or `tree` depending on which provider it registered.

## `welcome` (empty view)

`welcome.contents` is markdown-ish; `[text](command:id)` turns into buttons that
run that command. `when` (optional) decides whether that entry applies based on
context keys (`setContext`).

## Rules

- `id` is global; `container` is its own id (the button).
- The content arrives **after** `activate`: that is why `views` is declarative and
  the IDE can show the button (with its icon) before running a single line.
- When the panel unmounts, the IDE disposes the view in the extension (its
  `dispose` runs).

## Next steps

- [Extension Host](../architecture/extension-host.md) — where your code runs.
- [Extension API](../reference/vscode-api.md) — `registerWebviewViewProvider` and
  `registerTreeDataProvider`.
