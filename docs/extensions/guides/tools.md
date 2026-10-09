---
title: "AI tools"
group: extensions
order: 120
summary: "Contributing a tool to the chat: parameter schema, a host command and an optional React visual."
---
# AI tools

An extension can contribute **tools** to the AI chat, just like the builtins. They
register in the same registry (same shape, same enable/disable, same visual), but
the execution code lives in the package: the tool dispatches a **command** that
runs in the Extension Host.

```json
{
  "tools": [
    {
      "name": "acme_deploy",
      "label": "Deploy",
      "description": "Deploys the current project.",
      "parameters": {
        "type": "object",
        "properties": {
          "environment": { "type": "string", "description": "prod | staging" }
        },
        "required": ["environment"]
      },
      "command": "acme.deploy",
      "family": "acme",
      "familyLabel": "Acme Tools",
      "type": "acme-deploy",
      "typeLabel": "Deploy",
      "dangerLevel": "medium",
      "enabledByDefault": false,
      "icon": "server",
      "headerArgKey": "environment",
      "visual": "tools/deploy/visual.tsx",
      "visualCss": "tools/deploy/visual.css",
      "permissions": [
        { "id": "acme.prod", "type": "path_block", "label": "Block prod", "description": "…", "defaultAllowed": true }
      ]
    }
  ]
}
```

| Field | Required | Note |
|---|---|---|
| `name` | yes | The name the model sees. Regex `^[a-zA-Z][a-zA-Z0-9_-]{0,63}$` |
| `description` | yes | What it does (goes into the model prompt) |
| `command` | yes | The command id the extension registers (`commands.registerCommand`) |
| `label` | no | Label in the chat / Settings |
| `parameters` | no | JSON Schema of the arguments |
| `type`/`typeLabel` | no | The tool's type/group |
| `family`/`familyLabel`/`familyIcon` | no | Tool family (pack); created on its own if it does not exist |
| `dangerLevel` | no | `safe` \| `low` \| `medium` \| `high` (default `medium`) |
| `enabledByDefault` | no | default `true` |
| `icon` | no | productIcons id for the tool icon |
| `headerArgKey` | no | Argument(s) shown in the card header |
| `visual` | no | React module from the package (gets `{ args, result, status }`) |
| `visualCss` | no | Injected CSS for the visual |
| `permissions` | no | Policy-engine rules (`path_block`, `size_limit`, …) |

## How it runs

1. The model calls `acme_deploy` with its arguments.
2. The tool runtime dispatches `command` to your extension's host.
3. Your handler does the work and returns the result.
4. The result goes back to the model as text (JSON if you return an object).

## Rules

- An extension **cannot override** a builtin tool: the registry rejects the
  duplicate name.
- The `visual` is optional; without it, the tool shows in the chat with its
  default line.
- The CLI does **not** bundle `tools.visual` yet: if you use a visual, keep it in
  mind until `collectCodePaths` covers it (see [CLI](../reference/cli.md)).

## Next steps

- [Contributes](../reference/contributes.md) — the exact schema.
- [Extension Host](../architecture/extension-host.md) — where your command runs.
