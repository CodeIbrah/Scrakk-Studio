---
title: "Diff tabs"
group: editor
order: 70
summary: "How a read-only diff tab is opened: a synthetic scrakk-diff:// path with provided content, a provider that supplies the rows, and line-background decorations painted by the engine."
---
# Diff tabs

A diff is not a new tab kind: it is a **file tab with a synthetic path** that
shows a unified diff in the normal editor, in read-only mode. The text does not
come from disk — it is registered as *provided content* — and the changed lines
are tinted by line-background decorations.

The single entry point is `openDiffTab()` in `services/diff/index.ts`.

## 1. Opening a diff tab

`openDiffTab(options)` picks a provider, asks it for the rows, and:

```ts
const syntheticPath = `${DIFF_SCHEME}://${id}/${name}` // scrakk-diff://d1/foo.ts
setProvidedContent(syntheticPath, { text: renderDiffRows(rows), readOnly: true })
setDiffDecorations(sourceId, syntheticPath, rowsToLines(rows, options.colors))
openFileInEditor(syntheticPath, options.title ?? `${name} (diff)`)
```

`DIFF_SCHEME = 'scrakk-diff'` never collides with a real path, so the file-handler
registry resolves it as a `file`: it mounts the **editor**, not a viewer. The
basename goes at the end of the path so the tab strip shows the real name.

The provider's rows are rendered into the buffer with line prefixes, so the
buffer itself is the unified diff (context + removals above + additions below):

| Kind | Prefix |
| --- | --- |
| `context` | `' '` |
| `added` | `'+'` |
| `removed` | `'-'` |

The tab is read-only because it is a view, not a document. `fileSession` reads
the provided text instead of the disk (`providedContent.ts` says so explicitly:
`getProvidedContent(path)` is checked before `readEncoded`), and applies the
engine's read-only mode. The content lives while the tab is open and is dropped
by `destroyFileSession` → `clearProvidedContent`.

## 2. Providers

The diff is not computed by the tab code; a provider computes it:

```ts
export interface DiffRequest { path: string; before?: string; after?: string; ref?: string }
export interface DiffPayload { rows: DiffRow[]; summary?: DiffSummary }
export type DiffProvider = (request: DiffRequest) => DiffPayload | Promise<DiffPayload>

registerDiffProvider(id, provider)   // add / replace
unregisterDiffProvider(id) / hasDiffProvider(id) / listDiffProviders()
```

The only provider registered today is `CONTENT_DIFF_PROVIDER = 'content'`
(`contentDiffProvider`): it diffs `before`/`after` texts already in memory. It
handles two edge cases explicitly — a new file (only `added`) and a full delete
(only `removed`) — because `splitLines('')` returns one empty line (a phantom row).
A git provider "drops in": `git diff` already produces unified rows, so it would
just register and be requested by id.

## 3. The computation (`lineDiff.ts`)

`diffRows(before, after)` computes a **unified** diff:

- `splitLines(text)` drops the trailing empty element of a final newline (no
  phantom line);
- common prefix and suffix are trimmed **before** the LCS table, so the common
  case (a few edits in a big file) stays small;
- the middle is diffed with classic LCS (DP + backtrack). The tie goes to
  `delete`, so a replacement comes out removed-above / added-below;
- if the middle exceeds `LCS_CELL_BUDGET = 4_000_000` cells it falls back to
  "all old, then all new" instead of hanging the IDE.

`renderDiffRows(rows)` maps each row to `DIFF_ROW_PREFIX[kind] + text`, and
`summarizeRows(rows)` gives the `+N / −M` (there is no "modified"). `openDiffTab`
returns that summary so the caller can show it and does **not** toast (opening a
diff is one click away); it only notifies when the requested provider id does not
exist.

## 4. The decorations (`--color-diff-*`)

Diff tinting is a **separate decoration layer** from underlines: it paints the
whole line (gutter included) *behind* the text, whereas `setUnderlines` strokes
*inside* the text. The two are distinct engine channels.

```ts
setDiffDecorations(sourceId, path, lines) // replace one source's lines for one file
getDiffDecorations(path)                  // aggregate every source
clearDiffDecorations(sourceId, path?)     // drop one file or the whole source
packDiffDecorations(lines)                // quartets for the engine
```

`EditorDiffLine` is `{ startLine, endLine, kind, color }` with `endLine`
**inclusive**. `rowsToLines` groups consecutive rows of the same kind into a
single range: painting 200 lines is one decoration, not 200.

The color is mandatory (the C++ has no palette). `diffLineColor(kind, override)`
resolves the default from the theme and lets the caller override it per call:

```ts
export const DIFF_COLOR_VARS = {
  context: { cssVar: '--color-diff-context', fallback: 'rgba(0, 0, 0, 0)' },
  added:   { cssVar: '--color-diff-added',   fallback: 'rgba(63, 185, 80, 0.20)' },
  removed: { cssVar: '--color-diff-removed', fallback: 'rgba(248, 81, 73, 0.20)' },
  modified:{ cssVar: '--color-diff-modified',fallback: 'rgba(210, 153, 34, 0.20)' }
}
```

The fallbacks carry low alpha on purpose: they are line backgrounds, and an
opaque color would hide the code. `DiffColors` (the `colors` option) is the
per-call hook.

The engine side is `setDiffDecorations(data)` / `getDiffDecorationCount()` over
the bridge, marshalled by `pushDiffDecorations` (quartets
`(startLine, endLine, kind, rgba)`, `kind` 0 context / 1 added / 2 removed /
3 modified, `rgba` 0xRRGGBBAA). An empty array clears, and
`InnertaEngine.startHighlightPipelines` pushes the diff on every file/session
activation — without it the previous file's tint would stay.

## 5. Who uses it

- **AI edit tools**: `write_file`, `append_file`, `replace_in_file` and
  `delete_file` share `openEditToolDiff` (`services/diff/toolOpen.ts`), which
  calls `openDiffTab({ path, before, after, provider: 'content' })` with the
  tool's `originalContent` / `modifiedContent`.
- **Git**: planned. `registerDiffProvider` is the extension point; no git
  provider is registered yet.

Cleanup is automatic: `initDiffViews()` subscribes to `editorBus` and calls
`clearDiffDecorations(sourceId)` when a diff tab goes away (otherwise every
closed diff leaked its store entry).

## 6. Limits

| What | Status |
| --- | --- |
| Read-only unified diff tab in the normal editor | ✅ |
| Provider registry (`registerDiffProvider`) | ✅ |
| Line-background tint incl. gutter, theme-driven | ✅ |
| `+N / −M` summary returned to the caller | ✅ |
| **Git provider** | ❌ only `content` (in-memory before/after) is registered |
| Side-by-side diff editor | ❌ it is a unified buffer in one editor |
| Intra-line (word-level) highlights | ❌ line granularity only |
| Context collapsing ("⋯" separators) | ❌ the whole file is shown (a separator would be a fake row) |
| Coloring `border`/overview ruler from the diff | ❌ (see decorations limits) |

## Next steps

- [The editor](editor.md): the session and pane engine the diff tab reuses.
- [Editor decorations — range underlines](decorations.md): the sibling channel
  that paints inside the text.
- [Innerta as a surface, Scrakk as the owner of the UI](innerta-bridge.md): the
  paint list (`S3`) of which the diff tint is one use case.
- [Extensions docs](../extensions/README.md) and [main docs](../README.md).
