---
title: "File viewers"
group: features
order: 270
summary: "How non-code files open: the fileHandlers registry picks a viewer by match, mode and priority, and the built-in handlers that ship."
---
# File viewers

Non-code files do not have to open as raw text. A **file handler** declares which
files it grabs, whether they are shown as a viewer or in the editor, and what
buttons it contributes. The registry picks the winning handler; with no match,
the file opens in the Innerta text editor as before.

## The handler contract

Each handler is a self-contained folder (`features/fileHandlers/handlers/<id>/`)
that exports a `FileHandler` (`features/fileHandlers/types.ts`):

```ts
interface FileHandler {
  id: string
  match: {
    extensions?: string[]   // lowercase, no dot
    globs?: string[]        // simple * / ? over the basename
    languageIds?: string[]  // resolved by detectLanguageFromPath
    scheme?: string         // 'file', 'scrakk-view'; omitted = any
  }
  mode: 'view' | 'text' | 'both'
  priority?: number         // higher wins, default 0
  load?: () => Promise<{ default: ComponentType<FileHandlerViewProps> }>
  actions?: FileAction[]
}
```

- `view` — a non-textual piece (an image): the editor makes no sense.
- `text` — readable/editable: the editor opens it.
- `both` — in between (markdown, SVG): viewer by default, editor via the eye.

## How a viewer is picked

`features/fileHandlers/detect.ts` resolves the winner:

1. **Virtual paths** (`scrakk-view://<handlerId>/…`) resolve by id directly — no
   match applies, because there is no real file.
2. Otherwise `matches(handler, path)` combines with AND: a declared `scheme` must
   equal the path scheme; a handler that matches by extension does **not** claim
   a synthetic path with another scheme; then extensions, globs and languageIds.
3. `pickHandler` returns the highest `priority`; ties are resolved by the first
   in registry order.

```ts
import { fileHandlerRegistry } from '@features/fileHandlers'
const handler = fileHandlerRegistry.resolve('/repo/logo.png') // imageHandler
```

## Viewer vs. text: the effective mode

`effectiveMode(handler, path)` (`preferences.ts`) decides what the user sees:

| Case | Result |
|---|---|
| No handler | `text` (the editor) |
| Virtual path | `view` (the editor cannot read it) |
| `mode: 'view'` | `view` |
| `mode: 'text'` | `text` |
| `mode: 'both'` | the per-file preference, default `view` |

The preference is persisted in `localStorage` under `fileHandlers.mode` (a
path → mode map). `FileViewHeaderBridge.tsx` publishes the **eye** into the tab
header with `setTabHeader`; the eye only appears for `mode: 'both'`
(`canToggleMode`), and toggling it calls `setPreferredMode`. Images have no eye.

## Built-in handlers

`registerBuiltinFileHandlers()` (`builtins.ts`) registers three first-party
handlers once at startup:

| Id | Match | Mode | Priority | Viewer |
|---|---|---|---|---|
| `image` | `png jpg jpeg gif webp avif bmp ico` | `view` | 30 | `ImageViewer` |
| `svg` | `svg` | `both` | 20 | `SvgViewer` |
| `markdown` | `md markdown mdown mkd` | `both` | 10 | `MarkdownViewer` |

- `ImageViewer` reads bytes over IPC (`fs.readBinary`) and paints a
  `data:<mime>;base64,…` URL, because the renderer CSP allows `data:` but not
  `file:`.
- `SvgViewer` encodes the SVG text to a `data:image/svg+xml;base64,…` URL and
  shows it as an image; as `both`, it can also be edited as text.
- `MarkdownViewer` renders through the chat's `Markdown` component (Prism
  included), so code blocks are highlighted.

## Mounting and actions

`useFileViewDispatcher(path)` (`FileViewDispatcher.tsx`) is the mount point used
by the file tab. It resolves the handler, reacts to registry and preference
changes, dynamically imports the viewer, and — for editable formats — reads the
text with `readEncoded` so the viewer gets `content`. If the handler declares
`actions`, the dispatcher renders a toolbar and runs `action.run({ path, content, notify })`.

## Limits

- Only the three formats above ship as built-ins; PDF, notebooks and other
  formats have no viewer and open as text.
- None of the built-in handlers declares `actions` today, so no viewer toolbar
  appears for them.
- A viewer is chosen by `match` + `priority`, not by a global format table: two
  handlers on the same extension compete by priority.
- Handlers are registered from app code; extensions can contribute through the
  same registry (see the guide below).

## Next steps

- [Formats and encodings](../extensions/guides/file-handlers.md) — write your own handler.
- [Encodings](encodings.md) — the text codec used to read the file.
- [The editor](../editor/editor.md) — where `text` files land.
- [Layout & panels](layout.md) — how the editor area mounts the dispatcher.
