---
title: "Command palette"
group: features
order: 190
summary: "The command overlay: mod+shift+p, fuzzy search over the command registry, running commands, and how a command's keybinding becomes a real shortcut."
---
# Command palette

The **command palette** is a modal overlay that lists every command registered
in `commandRegistry` and runs the selected one. It opens with `mod+shift+p`
(`Ctrl+Shift+P`, or `⌘⇧P` on macOS) or by clicking the `SearchBar` trigger in the
[status bar](status-bar.md), and closes on `Escape` or a click outside the
panel.

`features/palette/CommandPalette.tsx` owns the overlay; the registries live in
`@services/commands`.

## Opening

Two paths converge on the same overlay:

- The global shortcut `palette.open` (`mod+shift+p`, `allowInInput: true`,
  `priority: 50`) is registered by the palette itself.
- `openCommandPalette()` dispatches the `open-command-palette` DOM event; the
  palette listens through `onOpenCommandPalette`. The status-bar `SearchBar`
  uses this path.

While open, a second shortcut `palette.close` binds `escape`
(`allowInInput: true`, `priority: 100`) to close it.

## Listing and searching

`commandRegistry.list()` sorts by category then title:

```ts
list() {
  return [...this.commands.values()].sort(
    (a, b) =>
      (a.category ?? '').localeCompare(b.category ?? '') ||
      msg(a.title).localeCompare(msg(b.title))
  )
}
```

`commandRegistry.search(query)` scores each command with `fuzzyScore` over its
title, category **and** id, keeps scores above zero and sorts descending. The
matcher is a case-insensitive subsequence with bonuses for word starts and
consecutive characters (`services/commands/fuzzy.ts`). An empty query returns
`list()` untouched. The palette re-renders when commands register or unregister
because it subscribes to the registry.

## Running a command

Return/Enter (or a click) calls `execute`:

```ts
async function execute(command: Command): Promise<void> {
  setOpen(false)
  await runCommand(command.id)
}
```

`runCommand(id)` looks the command up and awaits its `run()`, returning `false`
for an unknown id. Arrow Up/Down move the selection, and the selected row is
scrolled into view.

## Registering a command

Features register their actions with the registry:

```ts
import { commandRegistry } from '@services/commands'

const dispose = commandRegistry.register({
  id: 'layout.toggleChat',        // namespaced id
  title: 'Toggle chat',
  category: 'Layout',
  icon: 'chat',
  keybinding: 'mod+k',
  run: () => toggleChat()
})
```

`register` refuses a duplicate id, logs a warning and returns a no-op disposer
unless `{ allowOverwrite: true }` is passed.

### From keybinding to real shortcut

A `keybinding` on a command is not just a label. `register` also creates a real
global shortcut for it:

```ts
unsubShortcut = shortcuts.register({
  id: `command:${command.id}`,
  combo: command.keybinding,
  description: msg(command.title),
  handler: () => void command.run(),
  priority: 10
})
```

So a command registered this way is reachable both from the palette and from the
keyboard. `unregister(id)` (or the disposer) removes `command:<id>` too. Combos
are parsed by `@services/shortcuts`: `mod` maps to `meta` on macOS and `ctrl`
elsewhere, and the palette shows them via `formatCombo` (for example `⌘⇧P` on
macOS, `Ctrl+Shift+P` on Windows/Linux).

## Limits

- The palette is **commands only**: there is no `>` mode prefix, no file/symbol
  pickers, no recent-commands list, and no argument prompts for commands.
- Keybindings are declared in code; there is no user-editable keybinding file or
  palette shortcut editor.
- Several actions in the [titlebar](titlebar.md) menus call feature functions
  directly and are not registered as commands, so they do not appear here unless
  a command is registered separately.
- When two commands (or a command and another action) share one combo, every
  action registered on that combo runs in descending `priority`; there is no
  built-in conflict refusal.

## Next steps

- [Shortcuts & commands](shortcuts.md) — combos, priority and the registry API.
- [Layout & panels](layout.md) — commands that toggle panels and slots.
- [Extensions](../extensions/README.md) — how `vscode.commands.executeCommand`
  is routed to the app's commands.
