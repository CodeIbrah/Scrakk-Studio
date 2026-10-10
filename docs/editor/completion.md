---
title: "Inline completion"
group: editor
order: 60
summary: "The suggestion list a file's language server offers: where it comes from (textDocument/completion), how it is anchored at the caret and accepted through the engine's keyboard path, and its limits."
---
# Inline completion

When you type a word, a list of suggestions can appear next to the caret. This
doc follows that data from `textDocument/completion` to the moment the accepted
item replaces what you typed.

The suggestions are a **DOM popup** anchored at the caret; the engine draws
nothing. Today there is no ghost-text/inline rendering — see
[Limits](#6-limits).

## 1. Where it comes from

The list is produced by the file's language servers, over the existing LSP
client:

```ts
// services/lsp/api.ts
export interface TaggedCompletionItem { serverName: string; item: Record<string, unknown> }
export async function lspCompletion(filePath, line, character): Promise<TaggedCompletionItem[]>
```

`lspCompletion` sends `textDocument/completion` with `positionParams`, fans the
request to every server that covers the file, and **tags every item with the
server that returned it** (a commit must be addressable to that server later).
`lspCompletionResolve` (`completionItem/resolve`) also exists but is not wired
into the popup yet.

The renderer side is `services/completion/`:

| File | Responsibility |
| --- | --- |
| `state.ts` | the singleton store (`CompletionState`, `showCompletion`, `moveCompletion`, `selectCompletion`, `closeCompletion`) |
| `controller.ts` | request / ranking / accept / key handling |
| `caretRect.ts` | caret position in canvas pixels |
| `CompletionHost.tsx` | the DOM popup, mounted once in `AppShell` |

## 2. When it is requested

`innertaInput` calls the engine hook `interceptKey` **before** delivering a key
to the WASM, and `onKeyDelivered` after.

- `Ctrl+Space` → `requestCompletion(...)` immediately (and the key is consumed).
- A printable char, `Backspace` or `Delete` → `scheduleCompletion(...)`, which
  debounces `DEBOUNCE_MS = 70` ms so fast typing does not fire one request per
  keystroke.
- Any delivered key that is **not** a char, `Backspace` or `Delete` closes an open
  popup via `closeCompletionPopup()` (the popup keys above are consumed earlier).

`requestCompletion` bails without a module or path, reads the cursor with
`module.getCursor()`, and computes the **prefix** with `WORD_TAIL =
/[A-Za-z0-9_$]*$/` (`prefixAt(text, line, col)`): that prefix is what a commit
will replace. It holds a monotonic `requestSeq`; a response that arrives late
(`seq !== requestSeq`) or after the caret moved is discarded.

## 3. How it is shown

The popup is 100% frontend. Its anchor comes from `caretCanvasRect(module,
canvas)`: the engine exposes `hitTest(x, y)` (screen → text) but not the
inverse, so it does two ~40-iteration binary searches — first the Y of the
caret's line, then the X of its column — using `getTextXOffset()` and
`getLineHeight()`. If the caret line is not visible it returns `null` and the
popup stays closed (better than anchoring it in the wrong place).

`CompletionHost` renders a fixed-width `420px` list (`maxHeight = 240`), below
the caret and above it when it does not fit. Each row gets a `kindBadge(kind)`
glyph from the LSP `CompletionItemKind` (ƒ function, `x` variable, `C` type, `k`
keyword, `»` snippet…), the label, optional `detail`, and the selected item's
`documentation` in a footer.

## 4. How it is accepted

Accepting rewrites nothing directly. `acceptCompletion(module)` replaces the
typed prefix **through the engine's keyboard path**:

```ts
for (let i = 0; i < state.prefix.length; i++) module.key(259 /* GLFW_BACKSPACE */, 1, 0)
for (const char of item.insertText) module.char(char.codePointAt(0) ?? 0)
```

Backspacing the prefix and typing `insertText` character by character is what
preserves the **undo stack** and respects the language's auto-pairs (rewriting
the buffer would reset undo). `handleCompletionKey` maps the popup keys:

| Key | Effect |
| --- | --- |
| `ArrowDown` / `ArrowUp` | move the selection (wraps) |
| `Enter` / `Tab` | accept the selected item |
| `Escape` | close |
| `ArrowLeft` / `ArrowRight` / `Home` / `End` | close and let the engine move the caret |

The popup closes when a file changes (`hideCompletion`).

## 5. Ranking

`rankItems(items, prefix)`:

1. de-duplicates by `` `${label}:${kind}` `` — the same symbol from two servers
   (tsserver + eslint) is shown once; the first wins (the LSP routing already
   orders servers by priority);
2. keeps items whose `filterText` starts with the prefix (case-insensitive); if
   nothing matches it shows the unfiltered set;
3. sorts by `sortText ?? label`, then `label`;
4. slices to **200** items.

## 6. Limits

| What | Status |
| --- | --- |
| Popup list anchored at the caret | ✅ |
| Multi-server, tagged, de-duplicated, ranked | ✅ |
| Commit through the engine (undo + auto-pairs preserved) | ✅ |
| **Ghost-text / inline rendering** | ❌ there is no inline (grey) completion; it is a popup |
| `completionItem/resolve` (lazy docs/detail) | ❌ defined but unused; only docs sent inline are shown |
| Signature help, snippets with placeholders | ❌ not part of this service |
| Configurable trigger characters / auto-trigger setting | ❌ it triggers on any typed word char |
| Server-side `isIncomplete` / re-query | ❌ the popup filters locally after the first response |

## Next steps

- [The editor](editor.md): the pane engine and the session the popup reads from.
- [Editor decorations — range underlines](decorations.md): the other engine
  channel anchored on the buffer.
- [Innerta as a surface, Scrakk as the owner of the UI](innerta-bridge.md):
  geometry (`S1`) and the `overlay`/`inline` slots where completion fits.
- [LSP docs](../lsp/README.md): the client that answers `textDocument/completion`.
