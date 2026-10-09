---
title: "Slash commands (`/command`)"
group: chat
order: 20
summary: "Commands that start with `/`: any input can run them and register its own. The registry knows nothing about the UI; each input decides how to show the result."
---
# Slash commands (`/command`)

**Slash commands** are shortcuts that start with `/` (for example, `/variants`).
Any input —the AI chat, the social chat, a panel, an extension— can **run them**
and **register its own**. The registry knows nothing about the UI: each command
receives context and returns a message, and the input decides how to show it.

## Run

From any input:

```ts
import { slashCommands, isSlashInput } from '@services/slash-commands'

if (isSlashInput(text)) {
  const result = await slashCommands.run(text, { source: 'chat', sessionId })
  // result = { ok, message?, error? }
}
```

`source` identifies who asked for it (`'chat'`, `'social'`, …); `sessionId` is
optional.

## Register a command

Each command lives in its own folder, with the functionality in `logic.ts` (same
spirit as the tools) and the contract in `index.ts`:

```ts
import { slashCommands, type SlashCommand } from '@services/slash-commands'
import { myLogic } from './logic'

const myCommand: SlashCommand = {
  name: 'my-command',
  description: 'What it does, in one line.',
  usage: '/my-command [<something>]',
  category: 'Chat',
  args: [{ name: 'something', description: 'What it receives' }],
  run: (ctx) => myLogic(ctx.args)
}

slashCommands.register(myCommand) // allowOverwrite:true for retries by the same owner
```

`run` can return the result or a promise. It is called with
`{ source, sessionId, args, rawArgs }`.

## Custom UI

A command can show its **own** interface and return `ui: true` so the input does
NOT add a text message with the result:

```ts
import { showOptionModal } from '@services/modals'

async function run() {
  const chosen = await showOptionModal({ title: 'Variants', items })
  if (!chosen) return { ok: true, ui: true } // cancelled
  apply(chosen)
  return { ok: true, ui: true }
}
```

`showOptionModal` (options modal) and `showModal` (custom modal) are the two tools
for this; any command can use them.

## AI chat commands

They live in `features/chat/commands/`, each in its own folder, and are registered
with `registerChatCommands()` (called when the editor opens).

Today:

| Command | What it does |
| --- | --- |
| `/variants [<value>\|auto]` | With no argument, opens the active model's **variant picker** (options modal). With an argument, applies it directly. The options come from the catalogue (models.dev). |

The chat runs commands without sending them to the model: the `/…` text is
intercepted in the panel. If the command asks for `ui`, nothing is added to the
chat. While you type `/`, the input autocompletes with the registered commands.
