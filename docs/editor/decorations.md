---
title: "Editor decorations — range underlines"
group: editor
order: 10
summary: "The underline (errors, TODO, unused imports) is drawn by the engine canvas inside the text, not a DOM overlay. One central API distributes the decorations to each editor."
---
# Editor decorations — range underlines

When you see a word underlined in red (or a `TODO` notice), the editor paints it.
This doc explains how that underline reaches the engine's canvas.

The underline (the wavy line of an error, the stroke of a `TODO`, the notice of an
unused import) is drawn **inside the text plane**, by the engine's canvas. It is
not a DOM overlay: an overlay needs `lineToY/colToX` —the geometry Innerta does
**not** expose— and it also desyncs with scrolling and does not measure tabs or
wide glyphs.

```
LSP (diagnostics)       ┐
extensions (vscode)     ├─→ @services/decorations ─→ each live engine → SetInnertaUnderlines
search, git, SEF        ┘        (per file, per source)
```

## 1. The engine channel

The engine exposes three functions over the bridge: the IDE sends it the ranges to
underline and can ask how many it has.

```c
void SetInnertaUnderlines(const int* data, int count);   // sextuplets
void ClearInnertaUnderlines();
int  GetInnertaUnderlineCount();                          // diagnostic
```

`count` is the total number of **ints** (6 per range), in the style of bookmarks,
tokens and folding: the array is built with `malloc` + `HEAP32` in the loader (a JS
array is coerced to a number → `0` = `NULL`, and the copy would come from address
0).

Each range:

```
(startLine, startCol, endLine, endCol, rgba, style)
```

| Field | What it is |
| --- | --- |
| lines / columns | 0-based, the same convention as the rest of the bridge |
| `rgba` | `0xRRGGBBAA` (the order read by `ColorFromRGBA`) |
| `style` | `0` wavy · `1` straight · `2` dotted · `3` double |

**The wavy one uses VS Code's geometry, measured from its SVG, not invented.**
There the squiggle is a **6×3 px tile repeated in X** (`getSquigglySVGData`,
`viewBox='0 0 6 3'`, `repeat-x bottom left`): a **3 px tall sawtooth, 6 px period
and 45° segments**. The engine draws the same, **1 px lower** than the straight
line: the glyph is centered in the cell with `lineHeight = ascender + descender +
2`, so the last 2 rows are free and a 3 px sawtooth does not fit without eating the
descenders of g/j/p/q/y. VS Code has the same constraint (its default line is
1.5 em) and also rests the sawtooth on the bottom edge.

About antialiasing, without lying: VS Code's SVG is rasterized by the browser with
antialias; here `DrawLine` emits a **solid quad** and `SetAntialiasMode` only
stores a flag (there is no AA in the GL backend), so at 45° the stroke comes out
stair-stepped. At 1 px thickness the difference is an edge pixel, not one of shape.

> The first version used **0.75 px height and 4 px period** and *did not look
> wavy*: with a 1 px stroke, the vertices fell within the same pair of rows and the
> result read as a **straight line**. The amplitude has to exceed the stroke height
> for the wave to exist **in pixels**, and that is why VS Code uses 3 px.

Details that matter:

- **A range can cross lines.** The engine clips it to the visible part of each
  line, so the host does not need to know where each buffer line ends.
- **The span is measured by the engine's layout** (`HitTestTextRange`), the same
  source as the caret and the highlight of the word under the cursor: the underline
  stays aligned with the caret **by construction**. Watch the real detail: the
  engine's text model is monospaced (`x = column × charWidth`), so on a tab or a
  wide glyph the two deviate equally — the point is that they do not deviate
  *differently*.
- **An empty array is the clear order** (`count = 0`). It is what the bridge sends
  when opening another file and when closing the tab; skipping the call would leave
  the previous file's underlines.
- **A ZERO-width range (`start == end`) is widened to ONE character.** It is not a
  rare case: the CSS server reports `} expected` with `3:0 → 3:0` and
  `semi-colon expected` the same. The engine draws column to column, so 0 width is
  0 pixels; the minimum width is set by `packDecorations` (the engine's model is
  monospaced: one character = one advance). Without this the problem existed in
  the store and in the panel, and in the editor **nothing was painted**.
- `GetInnertaUnderlineCount` exists because `setUnderlines` is `void`: without the
  getter, the bridge can only assert "I sent the ranges", not "the engine has them"
  (the same criterion as `GetInnertaFoldingCount`).

> This used to be an **empty stub** (`SetInnertaUnderlines(const wchar_t*) {}` with
> its `g_underlines` declared and never read): the host could send underlines
> forever without a pixel being painted, and there was no way to tell it apart from
> "it does not ask for them".

## 2. The store (`@services/decorations`)

A range is registered **per source** and **per file**:

```ts
setDecorations('diagnostics:lsp:tsserver', '/w/a.ts', [
  { startLine: 4, startCol: 8, endLine: 4, endCol: 12, color: 0xf14c4cff, style: 'wavy',
    message: 'cannot assign to a `string` type' }
])
```

Reading AGGREGATES all the sources (`getDecorations(path)`), and `path` filters by
file because each WASM module is **one** view: `a.ts`'s errors cannot appear over
`b.ts`.

| Function | What for |
| --- | --- |
| `setDecorations(sourceId, path, list)` | replaces that source's in that file (`[]` clears) |
| `clearDecorations(sourceId, path?)` | drops a source (file or whole) |
| `getDecorations(path)` | what is pushed to the engine |
| `getDecorationsAt(path, line, col)` | what is under the cursor (hover; an empty range counts as its character) |
| `packDecorations(list)` | the sextuplets (engine format) |
| `themeColor(cssVar, fallback)` | theme var → `0xRRGGBBAA` |

Why multi-source: with **one** list per file, the last writer overwrites the other.
`tsc` publishes and clears the linter's underline, and vice versa — the same bug
the Problems panel already had.

**Change speed**: two equal lists do not emit. Servers repeat
`publishDiagnostics` on every keystroke and there are N live engines (one per tab):
without the cut, each repetition would walk every module to redraw the same.

## 3. Diagnostics (LSP + extensions)

`services/lsp/decorations.ts` is an **adapter**, not a store: the truth stays in
`diagnosticsStore`. One diagnostics source = one decorations source:

```
diagnostics:lsp:<server>          → color/label per severity
diagnostics:extension:<pub.name>  → same
```

| Severity | Style | Color (theme var) |
| --- | --- | --- |
| Error | wavy | `--color-danger` |
| Warning | wavy | `--color-warning` |
| Information | wavy | `--color-info` |
| Hint | **dotted** | `--color-text-muted` |

The color is read from the theme **when painting** and re-applied when the theme
changes: a theme that redefines its error red shows it both in the panel and in the
editor.

`initDiagnosticsDecorations()` (called in `main.tsx`) starts the channel and
reconciles with a **diff**: clearing everything and putting it back would make the
underline of every open file flicker on every keystroke.

**Hover**: hovering over the underline shows the problem message, above the
language hover (`diagnosticsAt` + `diagnosticHoverText`).

## 4. VS Code extensions (`editor.setDecorations`)

An extension can underline ranges with the VS Code API; the host translates it:

```ts
const type = vscode.window.createTextEditorDecorationType({
  textEditorDecorationType: 'underline wavy red'
})
vscode.window.activeTextEditor.setDecorations(type, ranges) // Range[] or DecorationOptions[]
```

Full path: the host **parses** the "CSS" string (style + color), stores the ranges
per file and pushes the state to the IDE (`decorations/set` → renderer → store with
source `extension:<id>`). The parsing lives in the host because it is pure Node and
is tested without booting the IDE — the renderer receives data, not a string.

Accepted forms: `textEditorDecorationType` (new), `textDecoration` + `color`
(classic), `hoverMessage` per range (`{range, hoverMessage}`), and the color names
(`red`, `orange`, …) besides `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`.

An empty list clears the type's and `type.dispose()` too: it is what the extension
uses to clean up. When the extension is turned off (`deactivate` or host death) its
underlines go with it.

## 5. Limits (stated, not disguised)

What is still not possible, without disguise:

| What | Status |
| --- | --- |
| Underline (4 styles) + color | ✅ |
| Multi-line range | ✅ (the engine splits it) |
| Problem message on hover | ✅ |
| **Text** color of a decoration (`color:`) | ❌ the engine only paints the stroke |
| `border`, `overviewRulerColor` (`after`/`before`) | ❌ |
| Decoration per-range `renderOptions` | 🟡 uses the **type's** color, not the range's |
| Scroll ruler with the problems | ❌ (it is another slot) |
| Gutter width per severity | ❌ (it is `S5` of the `innerta-bridge.md` plan) |

None of this is faked: what is not painted is not painted, and the compatibility
table (`src/shared/compatibility/surface/`) states the real level of each API.

## 6. How it is verified (pixels, not promises)

The tests cover the payload, the store and the packing
(`tests/decorations-store.test.ts`, `tests/editor-decorations.test.ts`,
`tests/lsp-diagnostic-decorations.test.ts`, `tests/extension-host.test.ts`). The
only thing that cannot be tested without the engine is what the user sees, so there
is a probe that **measures it in pixels**:

```bash
node tools/_make-decorations-vsix.mjs      # a real extension that underlines
node tools/_probe-decorations.mjs          # compiled app + screenshot
node tools/_probe-lsp-underline.mjs        # real LSP + stroke SHAPE
```

The decorations probe installs that extension, opens a file, runs its command and
counts orange pixels (extension decoration) and red pixels (error diagnostic)
inside the editor canvas, against the baseline and after clearing:

```
orange=1337 (base 479) · red=828 (base 679)  ← underline drawn
orange=479 red=679                           ← on clearing, it returns EXACTLY to base
```

**Counting pixels is not enough: the SHAPE must be measured.** A straight line and
a wave both paint, so `_probe-lsp-underline.mjs` exports the stroke as ASCII (top
row per column + bbox) and fails if the stroke stays on a single row. This is how a
real sawtooth looks (24 and 16 px ranges):

```
...#....##....#.....#.....##....##....##....##.....#..
.##....####....##..###....###..####.........##........
##..####..####..####..####..####..####..####..####..##
#....##....##....##....##....##....##....##....##....#
   top row per column: 151,150,150,149,151,151,151,150,149,…  ← period 6
```

It is the shape being sought: it goes down to the baseline every 6 px and back up,
3 px tall. A straight line would give **a single row** and `UP=0 DOWN=0`.

## 7. How someone adds a new source

A new source is just an id + its ranges:

```ts
import { setDecorations } from '@services/decorations'

setDecorations('search', path, matches.map((m) => ({
  startLine: m.line, startCol: m.start, endLine: m.line, endCol: m.end,
  color: themeColor('--color-warning', '#cca700'),
  style: 'underline'
})))
```

Without touching the engine, without touching the host, without a new channel. It
is enough to register the source (`search`) and clear it when the user closes the
search.
