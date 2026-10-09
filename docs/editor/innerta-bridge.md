---
title: "Innerta as a surface, Scrakk as the owner of the UI"
group: editor
order: 20
summary: "Plan for the family of extensions that touch the editor: they add things to the gutter, hovers, menus, decorations and UI live and without recompiling Innerta. This doc is design, not implementation."
---
# Innerta as a surface, Scrakk as the owner of the UI

The editor (**Innerta**) is a C++ engine compiled to WASM. This doc explains how
Scrakk adds things to it —gutter, hovers, menus, decorations— **live and without
recompiling the engine**. It is **design, not implementation**.

> The other track of the same bridge — **languages, color and grammars**, with its
> 4 sources and dynamic tree-sitter loading — is in [languages.md](languages.md).

Everything that says "today" is measured across both repos.

```
~/Documentos/Proyectos/InnertaEngine/InnertaEngine-Linux   (C++ → WASM, emscripten)
~/Documentos/Proyectos/BorealChat                          (Scrakk: renderer + host)
```

## 1. The thesis

The design mistake to avoid: implementing each new feature **inside** Innerta (a C
function per feature, a WASM rebuild per feature). That is what happens today with
the gutter: to show a Git marker you have to touch C++.

The correct architecture:

> **Innerta is a render surface** (text, input, geometry, primitives).
> **Scrakk owns the UI and the data**, and mounts it on top with React.

With that, adding things to the gutter, a hover or a panel over the editor stops
being a feature of the engine and becomes **an installed extension**.

### The two tracks (and why both are needed)

| Track | Who provides | Who paints | Example |
| --- | --- | --- | --- |
| **UI** (declarative SEF) | the extension brings **React components** in its bundle | Scrakk, in an editor slot | a blame lane, its own hover, a floating panel |
| **Data** (`vscode` API) | the extension provides **data** from the host (`registerHoverProvider`, diagnostics…) | Scrakk, with its native UI | Cline, a linter, a formatter |

VS Code only has the data track (an extension never provides editor UI). SEF can
have both, and the UI track is the one that gives the "without recompiling".

## 2. The bridge TODAY — exact inventory

### 2.1 Outbound (Scrakk → engine): 45 methods, 11 optional

`InnertaModule` (`features/editor/engines/innerta/InnertaEngine.ts`). The optional
ones (`?`) are the **ad-hoc** probe of "does this WASM know X?" — it exists because
the WASM is a binary and may be older than the renderer.

| Group | Methods |
| --- | --- |
| Lifecycle | `init` `shutdown` `frame` `setBounds` `setFocus` `resize` |
| Buffer | `setContent` `openFile` `getText?` `getSelectedText?` `getRevision?` `setCleanRevision?` `getCursor?` `hitTest?` |
| Input | `mouseMove` `mouseLeave` `mouseButton` `scroll` `key` `char` `setWasmClipboard?` |
| Theme | `setTheme` `setBgColor` `setAccentColor` `setTextColor` `setBorderColor` `setTextMutedColor` `setIndentGuideColor` `setTokenColor` |
| Extras | `setLanguage?` `setMinimapVisible?` `setBookmarks?` `heapBytes?` `getCharWidth` `getLineHeight` |
| Cursor/selection | `setCursor?` (go to line: outline and go to definition) `setSelection?` (exact range: expand selection) |
| Structure | `setFoldingRanges?` (triplets `start, end, kind` from `folds.scm`) · `getFoldingCount?` / `foldingIsHost?` / `foldingFromEngine?` (the engine tells how many ranges it has, whether they are not indentation, and whether it computed them with the embedded language's `folds.scm`) |
| Terminal (same WASM) | `setTerminalFont` `terminalMouseButton` `terminalMouseMove` `terminalReadOutput` `isAltScreen` `terminalHasSelection` `terminalGetSelectionText` `terminalClearSelection` `terminalGetCursorRow` `terminalGetCursorCol` |

### 2.2 Return (engine → Scrakk): ONE channel of 4 ints

```
Module._innertaOnEvent(type, a, b, c)   // fire-and-forget, no strings, no response
```

`ContextMenu(1)` · `CursorChanged(2)` · `RevisionChanged(3)` · `BookmarkToggled(4)`.

### 2.3 What ALREADY works (and is therefore the mold, not the problem)

| Mold | Channel | Status |
| --- | --- | --- |
| **LSP hover** (dwell 350 ms + `hitTest` + `lspHover` → HTML TooltipHost) | pointer → JS | ✅ **Scrakk UI drawn over Innerta** |
| **Context menu** (Scrakk items, engine coords) | `ContextMenu` event | ✅ same |
| **Bookmarks** (outbound + gutter click + return) | `setBookmarks(int[])` + `BookmarkToggled` | ✅ the only marker with a full cycle |
| Theme as **JSON inside** | `SetInnertaTheme(json)` | ✅ |
| Semantic tokens as an **array of ints inside** | `SetInnertaSemanticTokens(int[], count)` | ✅ **in use and painting** (before: declared and unconsumed) |
| Rectangles outside the canvas (holes/dim) | `SetInnertaOverlayHoles` / `DimRegions` | ✅ |

> The first two are already exactly the pattern this plan generalizes: **the UI
> belongs to Scrakk and is positioned over the canvas.** Today it is hardcoded
> (hover and a 5-item menu). The plan turns it into a system.

### 2.4 The view API (already in production, and it is the structural mold)

`services/innerta/viewFactory.ts` wraps `InnertaCreateView` with
`InnertaViewOpts`:

```c
mode (custom|editor|terminal|preview), lsp, syntax, folding, lineNumbers,
readOnly, cursorStyle, cursorBlink
```

The terminal panel uses it. And `InnertaViewSetReadOnlyRanges(ranges, count)` is
already **a per-range payload pushed from the host** — the exact precedent of what
the paint list needs.

Also, the `viewFactory` doc already says: *"in WASM each module is 1 view, so the
view IS the module's window"*.

### 2.5 What Innerta declares and does NOT implement

`src/Core/API/innerta_api.cpp`:

```cpp
INNERTA_API void INNERTA_CALL SetInnertaDiffDecorations(const wchar_t* /*json*/) {}  // ← empty
```

`g_diff_states` is stored/is not drawn. It is the test case for why the bridge
needs a capabilities handshake: a promise without an implementation cannot be told
apart from "it does not ask for it".

**Updated**: `SetInnertaUnderlines` **is no longer a stub**. It was
`void SetInnertaUnderlines(const wchar_t*) {}` (with its `g_underlines` declared and
never read) and now it is the real per-range underline channel —sextuplets
`(startLine, startCol, endLine, endCol, rgba, style)`, wavy/straight/dotted/double
drawing and `GetInnertaUnderlineCount`—. See [decorations.md](decorations.md): it
is the channel used by diagnostics (LSP and extension) and
`editor.setDecorations`.

### 2.6 The gutter today draws exactly three things

`Graphics/Gutter/GutterRenderer.h` (geometry = single source of truth for drawing
**and** hit-test):

```
[numbers] [bookmark icon 12px, 12px from text] [fold chevron, at 6px] | text
```

Constants: `kBookmarkIconSize 12`, `kBookmarkIconRight 12`, `kFoldChevronCenter 6`,
`kGhostAlpha 0.30`. Everything else in the gutter (diff, severity, blame) **does
not exist**.

### 2.7 Grammars: 20 tree-sitter grammars compiled INSIDE the binary

`emscripten/queries/`: bash, c, cpp, c_sharp, css, go, html, java, javascript,
json, lua, markdown, markdown_inline, python, ruby, rust, toml, tsx, typescript,
yaml.

And the color mapping already exists and is **lossy**: `innertaTheme.ts` has
`scopeToSlot()` — TextMate scope → **15 slots** of `SetInnertaTokenColor`
(0 keyword, 1 string, 2 number, 3 comment, 4 function, 6 type, 7 operator, 9
property, 10 class, 11 constant, 12 parameter, 13 tag, 14 attribute), by
**substring matching**, with `resolveTokenSlots()` applying the theme on
"last wins".

In other words: today the editor **categorizes** the color; it does not resolve it
by real scope. That is a hard ceiling for TextMate themes, and it is fixed in the
same channel as the decorations (§5.3).

**Update**: the host already resolves scopes for real and sends them over the token
channel (see [languages.md](languages.md) §12): TextMate grammars from extensions,
dynamic tree-sitter (the package's `.wasm`, in a separate `utilityProcess`) and LSP
semantic tokens, merged by priority. The engine's 15-slot ceiling is still real;
what is already real is that the SLOT is chosen by the theme (`tokenColors` enters
as a rule of the resolver) and that it can be AUDITED: the `editor.inspectTokens`
command shows, per file and per source, the scope stack, the slot and the color of
each token.

**And the "the host knows, the engine draws" mold is no longer only color.** Three
new channels follow EXACTLY the bookmarks pattern (per-pointer payload, `malloc` +
`HEAP32` + `free`, see `innertaLoader.ts`):

```c
SetInnertaFoldingRanges(const int* data, int count)  // triplets start,end,kind
ClearInnertaFoldingRanges()
GetInnertaFoldingCount() / GetInnertaFoldingIsHost()  // diagnostic
SetInnertaSelection(anchorLine, anchorCol, activeLine, activeCol)
ClearInnertaSelection()
```

The folding one forced a change in `FoldingManager`: the indentation heuristic
regenerated the ranges on every buffer change, so now there is a host mode
(`SetHostRanges` / `ClearHostRanges`) that disables it while there are tree ranges
and **preserves the folded state** per start line (re-tokenizing cannot unfold what
the user folded). An empty list is the order to go back to indentation — it is what
the bridge sends when opening another file, and without it the engine kept the
previous file's folds.

The two folding getters are not decorative: `setFoldingRanges` is `void`, so
`applyInnertaFolds` uses them to COMPARE what it asked for with what the engine has
(`getFoldingCount()` / `foldingIsHost()` in the loader). Without that its return
value would be "the call did not throw", which is a false green in every sense.

## 3. The 5 services Innerta must expose ONCE

None of them is "a feature": they are generic channels. After this, no new feature
touches C++.

| # | Service | Why | Status |
| --- | --- | --- | --- |
| **S1** | **Geometry out**: `textXOffset`, `gutterWidth`, `scrollOffset`, `firstVisibleLine`, `visibleLines`, `lineHeight`, `charWidth`; `lineToY(line)`, `colToX(line,col)` | it is **the** hole: the inverse exists (`InnertaHitTest`) and the metrics too, but not line/col → pixel, and the scroll is write-only | ❌ **none of this exists** (verified in the build's exports) |
| **S2** | **Viewport events** over the single channel: `ViewportChanged`, `Resized`, `FocusChanged`, `MarkerClick` | without it, anchored UI does not follow the scroll | ❌ (the enum has 4) |
| **S3** | **Paint list in**: spans + palette (JSON) | what must live **inside** the text plane: syntax color, underlines, backgrounds, borders. Replaces `SemanticTokens`+`Underlines`+`DiffDecorations` | 🟡 the **color already paints** over the token channel (LSP + extension TextMate + dynamic tree-sitter, see [languages.md](languages.md) §12), the **tree folding** enters over its own channel and the **underlines already paint** ([decorations.md](decorations.md): diagnostics + `editor.setDecorations`); backgrounds and diff are still pending |
| **S4** | **Range editing**: `SetInnertaTextRange(range, text)` | today every write ends in `setContent(full text)` → **it resets undo** | ❌ |
| **S5** | **Gutter lanes**: declare widths → the engine shifts the text | only if a lane needs its own space; if not, it is DOM over the current gutter | ❌ |

> `S1` is the gate of almost everything: **pointer-anchored things already work
> today** (hover, menu); **text-anchored** things (caret, line, range) need `S1`.

## 4. The slot system (a new SEF kind)

A **slot** is an area with an anchor where Scrakk mounts React. Innerta does not
know what is inside.

| Slot | Where | Anchor | First clients (dogfooding) |
| --- | --- | --- | --- |
| `gutter` | left of the text, per line | `line` or `range` | Git diff, bookmarks (already), diagnostic severity, blame, coverage |
| `hover` | floating next to a symbol | `position` (pointer or caret) | LSP hover (**already works**), extension hovers |
| `overlay` | free floating, 2D | `pointer` or `caret` | context menu (**already works**), completion, quick pick, peek |
| `inline` | inside the text flow, between characters | `position` | inlay hints, code lens, ghost text |
| `ruler` | scroll side bar | `line` | diagnostics, search results |
| `title` | editor header | — | the extension's editor actions |

DOM layer rules (so the editor's input is not broken):

- container with `pointer-events: none`; **only the widgets** with `auto`;
- a widget never eats `keydown` (focus stays on the canvas);
- the anchor is recomputed with `ViewportChanged` (`S2`) — not every frame;
- if a slot has no clients, nothing is mounted (zero cost).

### 4.1 The SEF kind

**It goes in SEF, not in the compatibility layer**:
`services/extensions/types/editorui/` (`schema.ts` + `api.ts` + `logic.ts` +
`store.ts`, like the other 10 kinds). Kind name to decide: `editorUI` / `editor` /
`innerta`.

```jsonc
// manifest.json of a SEF extension
{
  "contributes": {
    "editorUI": [
      {
        "id": "blame",
        "slot": "gutter",
        "anchor": { "kind": "line" },
        "component": "ui/Blame.tsx",          // React from the bundle (like panels)
        "trigger": { "kind": "always" },       // always | dwell | click | hover
        "when": "resourceExtname == .ts",
        "order": 100,
        "commands": ["myExt.openBlame"]        // what the component can run
      },
      {
        "id": "my-hover",
        "slot": "hover",
        "anchor": { "kind": "position" },
        "trigger": { "kind": "dwell", "ms": 350 },
        "component": "ui/Hover.tsx"
      }
    ]
  }
}
```

Context the component receives:

```ts
{
  path, languageId,
  line, col, range?,
  pointer?: { x, y },
  visibleRange,
  geometry: { lineToY, colToX, scrollOffset, lineHeight, textXOffset, gutterWidth },
  textOfLine: (line: number) => string,
  commands: { execute(id: string, ...args: unknown[]): Promise<void> }
}
```

What already exists and is reused **without inventing anything**: the bundle
component loader (`types/panels`), the extension lifecycle, the `when` evaluator
(`services/extensions/when.ts`) and the command registry.

## 5. The three answers the plan asked for

### 5.1 LSP truly consumed

**The intelligence is already there**: `docs/lsp/api.md` documents the full client
in the main (19 operations, multi-root, multi-server, semantic tokens, inlay hints,
reactive diagnostics store, `$/progress`, rename, code actions).

What is missing is distributing each operation on its natural route:

| Operation | How it is shown | Service it needs |
| --- | --- | --- |
| Hover | `hover` slot (already works) | — |
| Go to definition / refs / hierarchies | `overlay` slot + its own list | `S1` for caret anchoring |
| Completion / signature / rename | `overlay` slot (Scrakk native UI) | **`S1`** |
| Diagnostics | paint list (squiggle) + marker in `gutter` | **`S3`** |
| Semantic tokens | paint list | `S3` (today already over the old channel) |
| Formatting / code actions / rename edit | **range editing** | **`S4`** |

### 5.2 Dynamic gutter

The bookmark **already has the full cycle** (host pushes lines → engine draws →
click returns over the single channel). The plan generalizes it:

- `setBookmarks(int[])` → **markers**: `{ kind, line|range, icon, color, tooltip, commandId }[]`.
- Returns `MarkerClick(line, index)` over the single channel.
- **Two implementations, in this order**:
  1. **DOM over the gutter** (zero C++): the per-line anchoring comes from `S1`;
     Scrakk paints the new lanes. Git diff, diagnostics and extension decorations
     enter here.
  2. **Declared lanes** (`S5`) when a lane needs its own space (the engine shifts
     the text). Requires C++.

### 5.3 Grammars

**It has its own doc: [languages.md](languages.md)** (with the anatomy of a VS Code
language extension, the 4 sources and dynamic loading with its security). The
decision, in short:

tree-sitter **is not the fallback: it is one of the sources**. The 20 grammars
compiled inside the binary are the **native** source for those languages (no
worker, no data cost), and a grammar an extension brings runs in a **worker**
(`web-tree-sitter`, wasm) and enters over the **same channel** as the others.

The conceptual bridge that allows it: **a tree-sitter capture (`@type.builtin`,
`@variable.parameter`) and a TextMate scope (`type.builtin.ts`) are the same
dot-separated namespace** — and `MapCaptureColor()` in Innerta **already assigns
priorities** (comment 100 … variable 10). So there is **a single style resolver**
for the 4 sources:

native tree-sitter · dynamic tree-sitter · TextMate · LSP semantic tokens

That resolver is what breaks the current ceiling of **15 categories by substring**
(`scopeToSlot`) and what makes a theme's `tokenColors` work the same for all four
sources.

## 6. Phases

Ordered by dependency and payoff, not by shine.

| Phase | What | Touches C++ | Unlocks |
| --- | --- | --- | --- |
| **F0** | **Capabilities handshake** + versioned contract (replaces the ad-hoc probe of 11 optional methods) | no | knowing what the loaded WASM can do (the stubs stop lying) |
| **F1** | **`S1` geometry + `S2` viewport events** | yes (small) | **all** text-anchored UI: DOM gutter, completion, hints, decorations |
| **F2** | **DOM slot layer in Scrakk** + anchoring system. First clients: hover and context menu **rewritten on the system** | no | making "add UI" equal to mounting a component |
| **F3** | **Gutter as a slot** (DOM over the gutter): Git diff, severity, markers, click | no | a real gutter without touching the engine |
| **F4** | **SEF kind `editorUI`** (§4.1) | no | an **extension** adding gutter/hover/UI live |
| **F5** | **`S3` paint list**: squiggles/diagnostics, backgrounds, borders, decorations, and the Problems panel | yes | 🟡 **the squiggles are already there** ([decorations.md](decorations.md), per-range channel + `editor.setDecorations`) and the Problems panel too; backgrounds/borders and the ruler are missing |
| **F6** | **Grammars** → moved to the languages track: [languages.md](languages.md) L3 (dynamic tree-sitter) and L4 (TextMate) | — | — |
| **F7** | **`S4` range editing** | yes | formatters, quick fixes and rename **without losing undo** |
| **F8** | The heavy stuff: inlay hints, code lens, sticky, peek, diff editor, custom editors (there is already `InnertaCreateView` for custom views) | yes | fine fidelity |

**Two tracks in parallel, with shared foundations.** There is no "shortcut": the
order comes from the dependencies, and there is a hard dependency that cannot be
skipped — **the scope resolver + paint list** (`S3`) is what the three color
sources depend on. Putting it at the end forces rewriting the three.

| Track | Shared foundation | After |
| --- | --- | --- |
| **UI** (F0–F4): slots, geometry, gutter, `editorUI` | **F0** capabilities + **F1** geometry/viewport | F2 slot layer → F3 gutter → F4 `editorUI` |
| **Languages** ([languages.md](languages.md) L0–L7): 4 sources, dynamic tree-sitter, TextMate | **L1** scope resolver + paint list | L2 SEF kind `languages` → L3 dynamic tree-sitter → L4 TextMate → L5 LSP merge |

The only real fork: `F1` (geometry) and `L1` (resolver) are both "first", and they
touch the same engine. They can be done in separate branches but **they do not
clash** (one is geometry, the other is styles).

## 7. Open decisions

**D1 — SEF kind name**: `editorUI` / `editor` / `innerta`.
**D2 — Is the gutter DOM over the current area (zero C++) or declared lanes
(`S5`)?** Recommendation: DOM first; `S5` only when a lane needs its own width.
**D3 — Where does the state of the markers/decorations live?** The engine is
stateless and receives whatever is pushed to it; the state and persistence live in
Scrakk (there are **N WASM modules**, one per tab: the state cannot live there).
**D4 — `S1` as read functions (ints, no alloc) or JSON?** Recommendation: ints via
an `out` pointer for what is called per frame; JSON only for payloads.
**D5 — A single data channel (`S3` paint list) or keeping the current three?**
Recommendation: **one**, and the three old ones become use cases (otherwise, every
new feature invents its channel).
**D6 — Grammars**: the decisions are in [languages.md](languages.md) §10 (kind
name, shared worker or per editor, parser owner, native or wasm-only?, does
`tags.scm` enable outline/goto-definition without an LSP?).
**D7 — Remove the path duplication?** Today the module API (45 methods, one module
per tab) and the view API (`InnertaCreateView`, N views per module, already in
production with the terminal) coexist. Unifying them would be a big RAM saving in
multi-editor.

## 8. Risks

The points where things can break:

| Risk | Why it hurts | Mitigation |
| --- | --- | --- |
| The loaded WASM does not match the header | there are already 2 empty stubs that "exist" | F0: capabilities + a test against the real symbols of the `Module` |
| N WASM modules (one per tab) | each feature multiplies; RAM | D3: stateless engine, state in Scrakk; measure with `heapBytes?` |
| Two tokenizers (native tree-sitter + TextMate wasm) | CPU/RAM, and two color truths | tree-sitter default offline, TextMate for the rest, explicit priority; tokenize only the visible range in a worker |
| The DOM overlay desyncs on fast scroll | the UI "floats" badly | re-anchor via `ViewportChanged`, not per frame; transform on the container |
| The overlay eats the input | the editor stops typing | `pointer-events: none` + never capture the keyboard |
| Duplicating the coverage truth | Scrakk's `surface/` already exists for this | each phase updates **one** table entry, not a new list |
