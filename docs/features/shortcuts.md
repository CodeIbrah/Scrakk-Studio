---
title: "Shortcuts & commands"
group: features
order: 130
summary: "Two registries: commands (the palette + VS Code compatibility) and keyboard shortcuts (combos, priority, the command palette)."
---
# Shortcuts & commands

Two registries drive every action a user can trigger:

- **Commands** (`@services/commands`) — the actions, searchable from the **command
  palette**.
- **Shortcuts** (`@services/shortcuts`) — the keyboard combos bound to them.

## Commands

Each feature registers its actions:

```ts
import { commandRegistry } from '@services/commands'

const dispose = commandRegistry.register({
  id: 'layout.toggleChat',        // namespaced id
  title: 'Toggle chat',
  category: 'Layout',
  icon: 'chat',
  keybinding: 'mod+k',            // optional: registers a real shortcut
  run: () => toggleChat()
})
```

- `register` is idempotent-guarded: a second `register` of the same id warns and is
  ignored unless `{ allowOverwrite: true }`.
- A `keybinding` **registers the shortcut** for you (`command:<id>`, priority 10).
- The registry `list()` sorts by category then title; `search(query)` does a
  **fuzzy** match on `title` + `category` + `id` (what the palette uses).

## Shortcuts

```ts
import { shortcuts } from '@services/shortcuts'

shortcuts.register({
  id: 'chat.send',
  combo: 'mod+enter',
  description: 'Send',
  preventDefault: true,
  priority: 5,
  handler: () => send()
})
```

**Combo format**: keys joined by `+`, order- and case-insensitive.

- Modifiers: `ctrl`, `alt`, `shift`, `meta`, and **`mod`** (= `ctrl` on
  Windows/Linux, `meta` on macOS).
- Key: letters, digits, symbols, `f1`–`f24`, `arrowup`/`up`, `enter`, `tab`,
  `escape`/`esc`, `space`/` `, `backspace`/`del`, `delete`, `home`, `end`,
  `pageup`/`pgup`, `pagedown`/`pgdn`, `insert`/`ins`, `capslock`.
- Examples: `'shift+tab'`, `'mod+shift+p'`, `'ctrl+alt+f12'`, `'f2'`.

Conflicts on the same combo are resolved by **`priority`** (higher first). Combos
without a modifier do not fire inside inputs/textarea unless `allowInInput: true`.

There is also a React hook (`useShortcut`) for components.

## The command palette

The palette lists `commandRegistry.list()` and filters with
`commandRegistry.search(query)`. Executing a command runs its `run()`; commands
registered with a `keybinding` are also reachable from the keyboard.

## VS Code compatibility

Commands requested by an extension through `vscode.commands.executeCommand`
(including `workbench.action.*`) are resolved by `runVSCodeCommand`: a table of
built-in mappings first, then the app's real command registry. A command with no
route fails with a clear message. See
[Extension API (`vscode`)](../extensions/reference/vscode-api.md).

## Limits

- There is no user-editable keybinding file: combos are declared in code (a command
  can still carry its `keybinding`).
- `import`/`export` of shortcuts and a shortcut editor UI do not exist.

## Next steps

- [Panels & features](README.md) — the other areas.
- [Extension API (`vscode`)](../extensions/reference/vscode-api.md) — command compatibility.
