---
title: "Changelog 0.1.3"
group: changelog
order: 30
summary: "Relevant changes in Scrakk Studio. The welcome screen shows the first entry (the newest) in the Announcements section, so the newest goes on top."
---
# Changelog

Relevant changes in Scrakk Studio. The **welcome screen** shows the first
entry (the newest) in the **Announcements** section, so the newest goes on top.

Format: `## <version> — <title>` and bullets per area. Entries already
published are not edited. The file goes per version:
`docs/changelog/changelog-<x.y.z>.md`.

---

## 0.1.3 — TBD

### Welcome (UI)
- **The 3 buttons on the welcome screen actually work**: they called props that
  **nobody passed** (`PanelHost` mounts the panel with no props, so the
  `() => {}` defaults made them look perfect and do **nothing**). Now **New
  file**, **Open file**, and **Open folder** call the real actions: the native
  file dialog (multi-selection, each file opens in the editor), the native
  folder dialog (the chosen folder becomes the workspace), and creating a new
  file in the workspace — if no workspace is open, the folder is requested first
  — which opens in the editor. The three live in `@features/explorer` and the
  **File menu reuses them** instead of keeping its own copy.

### Git panel (UI)
- **The panel no longer re-renders on every keystroke**: the commit message
  lived in the panel component (1500+ lines with branches, history, diffs and
  the file tree), so **every letter re-rendered the whole panel — and the tree**.
  It now lives in its own `memo` component (`CommitBox`), and its `<textarea>` is
  **uncontrolled**: it only re-renders when it crosses the "has text / no text"
  boundary, which is the only thing that toggles the buttons. Typing 40
  characters is now a couple of renders instead of 40.
- **The tree's `memo` works again**: the staging callbacks were inline arrows,
  so they changed identity on every render of the panel and the shallow compare
  of **every row** failed (the whole tree repainted). `stage`/`unstage`/`discard`
  are now stable (`useCallback`) and the per-row actions read the mutable data
  (selection, index) through refs, so they never change. The changes tree is
  also `memo`'d, so panel-only re-renders (opening the branch form, toggling a
  section, logging in) no longer touch it.
- **The commit history is not painted off-screen**: each entry uses
  `content-visibility: auto` with `contain-intrinsic-size` (same treatment as
  the chat's message list), which matters because the log loads up to 200
  commits.
- **Per-file staging, like VS Code**: the only way to prepare a file was to
  **select it first** in the tree so that the bulk bar (`Stage (N)`) appeared.
  Without that, the **Commit** button stayed disabled no matter what you typed
  in the message box — it only commits what is in the index. It did not explain
  why either. Now each row shows **stage / unstage** on hover (the `+` / `×`
  that VS Code shows), on top of the existing bulk bar. The two buttons keep
  their meaning: **Commit** = what is staged, **Todo** = `git add -A` + commit.
- The tree now accepts **declarative per-row actions**
  (`rowActions?: (node) => RowAction[]`): the explorer draws them with its own
  style (size, color, and the same hover reveal as the `…` button), so a
  consumer does not have to replicate CSS or reach into the row layout.

### AI chat (UI)
- **The "Thought" block no longer falls far from the tools above it**: the air
  came from three places adding up — the tools block's bottom margin (2px), the
  assistant bubble's padding (4px) and the 8px gap between messages. The
  between-messages gap is now `--space-1` (4px) and a message's inner gap is 0
  (the bubble already carries its own padding).
- **Markdown tables fill the panel instead of shrinking**: two geometry bugs
  stacked, and neither threw. The assistant bubble was shrink-to-fit
  (`flex-basis: auto`), so a table inside was measured against the **content**
  width — with short cells the table came out narrow and the rest of the panel
  stayed **empty**. And `.tbl { width: 100% }` stops a table from ever exceeding
  its container, so instead of scrolling it **squashed** the columns. The bubble
  now fills the row (`flex: 1 1 auto; min-width: 0`) and the table uses its
  natural width up to 100% (`width: max-content; min-width: 100%`): it fills the
  panel when it fits and the wrapper scrolls when it does not.
- **The code-block header reads as UI, not as code**: the language label was
  uppercase, monospaced and letter-spaced — it read like a shout and sat oddly.
  It now uses the IDE's UI font (`--theme-font-ui`) in normal case, showing the
  language id exactly as the fence wrote it (`tsx`, not `TSX`).
- **The copy button is a chip that fits the block**: it started as a full-height
  square (32×28) with only the top-right corner rounded, so the hover highlight
  read as a hard-edged block covering the header. It is now a 20px chip that
  keeps the code block's own radius (`--radius-sm`), so the hover matches the
  block's corner instead of covering it.
- **Every message has copy; the user's has edit too**: the action bar existed
  only for the assistant's final text and only to copy. It is now on **both**
  roles, and the **user's** message gained an **edit** button that turns the
  bubble into an inline editor (save with the button or Cmd/Ctrl+Enter, cancel
  with Escape). The assistant's reply is read and copied, not rewritten. The bar
  sits **below** the reply and **inside** the user's bubble — and when it is
  inside, the bubble repaints the icons (`--msg-action-color`) because the muted
  default is nearly invisible on the accent background. The row is a stack
  (bubble + actions) rather than a bare bubble, which is what carries the widths
  for both roles. The
  inline editor follows the composer's rule: the textarea itself has **no**
  border, background or resize handle — the frame lives on a container and only
  shows on focus (the native resize grip drew a corner the box did not need).
  Saving is functional, not decorative: editing a **user** message updates it
  and **re-sends** — what followed answered a text that no longer exists, so it
  is dropped and the answer is re-requested, the same criterion as Regenerate.
  The handler is passed to every bubble, so it reads the live messages through a
  ref: depending on `messages` would change its identity on every streamed token
  and defeat the bubble memo, re-parsing the whole history per token.
- **The user's message spans the full width**, like the assistant's: it used to
  be a shrink-to-fit box capped at 60% and pushed against the right edge, so it
  read as a small card next to a wide reply. Both stacks fill the row now, so
  the message sits centered in the chat instead of hugging the right side.
- **The message list fades at its bottom edge and keeps its last message
  whole**: content leaving the bottom now dissolves instead of being cut off,
  via a `mask-image` gradient rather than a colour overlay — the panel is
  transparent and the theme can carry a background image, so there is no colour
  to cover with. The list's bottom padding is the SAME size as the fade, so at
  the bottom the last message ends exactly where the fade begins and stays
  fully visible. Sending your own message always scrolls down as well: if you
  were reading history, sending and not seeing what you sent is worse than
  losing the spot (while the model replies it keeps the old "only if you are
  near the bottom" rule, so reading is never interrupted).
- **Your last question stays anchored at the top while you read the answer**:
  the messages are grouped into turns (your message plus what followed) and
  **only the last question** carries `position: sticky; top: 0` — so a question
  you just sent (still down the page) does NOT jump up to anchor: `sticky` only
  pins it once it reaches the top, and the previous question never anchors at
  all. It is **pure CSS**: the first attempt picked the anchor with JS and
  toggled a class on scroll, which not only made the new anchor teleport into
  view from off-screen (a flicker) but also added work to every scroll event.
- **The user bubble is opaque again**: `--color-active` is a TINT — `scrakk-night`,
  the default theme, has `rgba(255, 255, 255, 0.12)` — so a plain
  `background: var(--color-active)` let the chat show through the bubble. It uses
  the composer's variable now (`var(--activitybar-bg, var(--color-surface))`),
  which is opaque and follows the theme, so the anchored question also covers
  what scrolls behind it — helped by a shadow towards the bottom (`0 2px 6px rgba(0,0,0,·)`),
  so the pinned bubble reads as floating over the reply.
- **The last question can be edited while the model is answering**: it is the one
  you are looking at, and its edit button used to disappear for the whole
  stream. Editing it ABORTS the stream and waits for it to close before
  re-sending — without waiting, the aborted run's `finally` would clear the new
  stream's busy flag and both would write the same session.
- **The user's actions sit on the message's row, so the bubble is one line**:
  inside the bubble they used to have their OWN row, which added a full row of
  height to every message. They are flex items of the bubble now — centred
  vertically and pushed to the right edge — and the bubble's vertical padding is
  at its minimum, so a one-line message gives a one-line bubble. The buttons are
  also the composer's `IconButton` (`shape="rounded"`, `size="sm"`), nudged 5px
  right to line up with the bubble's edge.
- **"Back to the message" on the anchored question**: an `arrow-up` action that
  scrolls to the question's real place, which is where its answer begins. It is
  the way back when you are deep in a long reply with the question pinned at the
  top. The position is measured with the sticky temporarily off, because while
  pinned its rect is no longer its place.
- **A sharper logo in the empty state**: `public/logo/scrakk-studio.svg` was
  replaced with a vector version (the old one was a raster PNG wrapped in an
  SVG). The empty state paints it as a silhouette through `mask-image`, and that
  mask reads the SVG's **alpha**, so the inner symbol has to be a **hole**: the
  new file drew it with an opaque `#0F0F0F` fill, which turned the mask into a
  solid disc and made the symbol vanish. It is cut out now with an SVG-internal
  mask on the circle.
- **Tool rows highlight on hover and open their result on click**, with the
  decision living in **each tool's folder**, not in the chat block:  - The **shell** (`ToolCallShell`) provides the behavior: it renders the row as a
    button with hover and, on click, opens the tool's **result in a modal** (the
    same `plain` pattern as the subagent chat: mounted inside the chat panel, no
    overlay, so you can keep interacting). The modal shows the **arguments** the
    model sent and the **raw output** (monospaced and scrollable, since it is a
    dump, not prose), with proper states for "still running" and "no output".
  - Each tool opts out from **its own manifest** with `onOpen`: unset means the
    generic result modal, `'self'` means the tool already handles the click, and
    a function means a custom handler. The subagent (`task`) declares
    `onOpen: 'self'` because its card opens the subagent's chat.
  - The **hover is only a brightness change**: the row's text goes from
    `--color-text-muted` to `--color-text`, with **no background or box** (the
    first version added a highlighted background and looked wrong). The tool
    **icon brightens too** (it lives outside the shell's button, so the chat sets
    it on the row), and tool visuals that carry their own color —diffs,
    previews— keep it.
  - The row is a full-width block, so the text wraps **exactly** at the
    available width: as an inline button it shrank to fit and the text broke to
    the next line even when there was room beside it.
  - The result modal provides its own frame: the `plain` host adds **no padding,
    no visible title and no close button** (`spec.title` is only the
    `aria-label`), so the view draws the header (tool icon + name + status +
    close) and a body that scrolls on its own, keeping the header fixed.
- The first attempt decided this in the chat block by looking at `renderBody` —
  and since **27 tools ship their own visual**, the `!renderBody` condition left
  every one of them out and nothing was clickable. That coupling is what the
  declarative `onOpen` removes.

### Explorer (UI)
- **The filtered tree (Git → Changes) no longer costs a render per folder**: the
  view auto-expands the ancestors of the files it shows, and it did it with
  `for (dir of ancestors) ensureExpanded(dir)` — each call triggered a state
  update, so changes spread across N folders meant **N renders**, each one
  re-flattening the whole tree (that is what made opening the Git panel heavy).
  There is now `ensureExpandedMany(...)`, which batches every new folder into a
  **single** update. The effect also depended on the `workspace` object, which
  changes identity on every render, so that loop ran on all of them; it now
  depends on the stable callback.
- **Rubber-band to stage**: the selection rectangle's action is now the
  consumer's (`onLasso`), and it receives the swept paths **plus the default
  `select`** so it can compose instead of replacing:
  ```ts
  onLasso: (paths, { select, additive }) => {
    select(additive ? [...selected, ...paths] : paths)
    stage(paths)
  }
  ```
  The Git panel uses exactly that: sweeping the box selects and **stages**
  whatever was not staged yet. The default (no `onLasso`) is unchanged: the
  rectangle just selects.
- **Ctrl/Cmd + rubber-band adds to the selection**: the rectangle always
  cleared the selection before starting, so there was no way to sweep several
  areas and keep them. Now `Ctrl`/`Cmd` held at the start makes it **additive**:
  the previous selection is kept, the swept paths are **unioned** with it, and
  the visual joins account for the rows that were already selected (no border
  in the middle of a contiguous block). The consumer receives `additive` in the
  `onLasso` context, so Git can honor it too.
- **Explorer API published and typed**: `ExplorerViewProps`, `RowAction`,
  `FileNode`, and `LassoContext` are exported from `@features/explorer`, so a
  host can type its own props without importing internals.

### Fixes
- **The Social panel showed the login for a few seconds when opening it**: `me`
  is `null` both when there is **no session** and while the account is **still
  being resolved**, so the panel painted the login screen and then switched to
  the friends list. Now the provider exposes a `ready` flag that only turns true
  once it actually knows whether there is a session (and the "no accounts
  saved" case counts as ready, not as a wait), and the panel shows a loading
  placeholder until then instead of guessing.
- **Sending a photo no longer adds a 📷 next to it**: the `body` of a message
  could not be empty (`messages_body_check` required
  `char_length(body) >= 1`), so an image-only message was filled with the `'📷'`
  character just to pass the constraint. That emoji was **real data**: it
  travelled to the other side and was painted as the message text, above the
  image. Now a message whose only content is attachments goes with an **empty
  body** (migration `0025_messages_empty_body.sql` relaxes the CHECK for
  `normal` messages; `codefile` messages still require their JSON envelope), and
  the app rejects a send that has neither text nor attachments. The reply
  previews and the incoming-message notice show "Attached image" instead of a
  blank line when the quoted/arriving message has no text.

### Editor — diff (engine + API)
- **The engine can now paint a DIFF, not just an underline**: the
  `SetInnertaDiffDecorations` export existed but was an **empty stub** in C++
  (`{}` with a `g_diff_states` that was written and never read), so the host
  could send a diff forever without a single pixel changing. It now takes
  **quads** `(startLine, endLine, kind, rgba)` — the same `malloc` + `HEAP32`
  pattern as the underlines — and paints a **line background behind the text**,
  spanning from the left edge so the **gutter number gets tinted too** (the
  VS Code look). It is a different layer from the underline: the stroke goes
  *under* the text, this goes *behind* it. `GetInnertaDiffDecorationCount`
  exists for the same reason as the underline's: a `void` setter with no
  read-back can only claim "I sent the ranges", never "the engine has them".
- **The color is not baked into the engine**: it paints exactly the `rgba` it
  receives and does not interpret `kind` for coloring — which is what lets the
  caller choose the tint. The default comes from the theme
  (`--color-diff-added` / `--color-diff-removed` / `--color-diff-modified`) and
  the API overrides it per call.
- **`openDiffTab()` — spawn a read-only diff tab that shows BOTH sides**: the API
  resolves a **diff provider** (`registerDiffProvider`; `'content'` ships built
  in and works on an in-memory before/after pair) and opens a tab. A diff tab is
  **not a new tab kind**: it is a file tab with a synthetic
  `scrakk-diff://<id>/<file>` path, so it reuses the editor, syntax highlighting
  and the tab strip as they are. The scheme keeps it from matching any file
  handler, so the tab mounts the editor and not a viewer. The provider registry
  is what lets a git source be added without touching anything else. Opening a
  diff shows **no notification**: the API returns the `+N / −M` summary for the
  caller to use, because a toast on a one-click action is pure noise (only a
  missing provider warns, and that is a real error).
- **The buffer IS a unified diff, not one side**: context lines, then the
  removed ones (`-`, red tint) and the added ones (`+`, green) — removed **above**,
  added **below**, the `git diff` order. A single-side buffer cannot show text
  that is gone, and seeing both versions is the whole point. The prefixes live in
  the text because this is a real editor — the only place a prefix can exist is
  the line — and without them a removed and an added line look identical but for
  a soft tint. The decoration ranges are computed over the **rendered** buffer
  (not the original file), or the tint lands one line off.
- **The diff is painted the FIRST time the tab opens**: the push lived in the
  file-open paths but **not** in the session-activation one, so a fresh diff tab
  opened with its `(diff)` name and no colors — and the colors appeared only when
  another tab triggered the next push. It now goes where the underlines already
  did (`startHighlightPipelines`), the single place every document switch passes
  through.
- **The read-only tab really is read-only**: `EditorWindow::SetReadOnly` existed
  and `InputManager` already guarded typing, backspace, delete, enter, tab and
  undo/redo — but **paste and cut came in through the clipboard actions**, not
  the input manager, so both slipped past it. They are now guarded, and
  `SetInnertaReadOnly` exposes the mode to the host. The caret still moves and
  the selection still copies: a diff is read and copied, not written.
- **The editor can hold content that is not on disk**: `fileSession` used to
  read every path from disk, so a synthetic path meant for a diff came back
  empty — a blank tab with no error. There is now a small **provided-content**
  seam (`@features/editor/providedContent`); anything that opens a tab with
  in-memory text registers it there and the session honors it, including the
  read-only flag. The mode is re-applied on activation because it lives in the
  **engine** (one WASM module per panel), and switching tabs inside a panel
  otherwise left the diff's read-only stuck on the next file.
- **The AI edit tools open their diff on click**: `write_file`, `append_file`,
  `replace_in_file` and `delete_file` declare `onOpen` and share one handler, so
  the diff needs neither git nor disk. `delete_file` reads the file **before**
  deleting it, and a deletion renders what the file **had**, entirely marked as
  removed — a single-side buffer cannot show text that is gone.
- **…and the results actually carry the texts**: the tool results reached the
  cards with only `content`/`success`/`blocked`. **Both** chat paths — the main
  service and the subagent runner — dropped `originalContent`/`modifiedContent`,
  so the card's `onOpen` received `undefined` and **the click did nothing**, with
  no error anywhere. They are forwarded now; the wiring test asserts it in both
  paths precisely because one runner fixing it is not enough.
  `ToolOpenContext` now carries that pair to the tool.
- **A synthetic path is not stolen by a format viewer**: the handler match ran
  the extension rules on ANY path, so the diff tab of a `readme.md` was claimed
  by the markdown viewer and the editor never appeared (same for any format
  sharing the diffed file's extension). A path with a scheme other than `file`
  is now only claimed by a handler that declares that scheme.

### Fixes (themes)
- **The theme validator no longer reports non-color keys as invalid colors**:
  it iterated **every** key under `colors` and treated anything that was not a
  number as a color, so a theme declaring `iconFilter: grayscale(1)`,
  `glassBlur: "12px"` or `iconColor: var(--text-color)` — legitimate keys this
  parser does not consume — produced three `color inválido` warnings per load.
  Only the keys that **are** colors (a single known list) are validated now;
  anything else is ignored silently, and `var(--token)` is accepted as a color.
- **`--color-success` is emitted**: the token was in the theme schema but
  `buildCssVars` never published it, so 11 CSS call sites fell back to a
  hardcoded green (`var(--color-success, #3fb950)`) and ignored the theme —
  the same bug `warning`/`info` had before.

### Terminal (node view)
- **Zooming the canvas no longer blurs the terminals**: the view scales the whole
  world with a CSS `transform: scale(k)`, which stretches each terminal's canvas
  **bitmap** — at 2× the text turned to mush. The engine already has a crisp
  zoom (the one behind Ctrl +/- and Ctrl+wheel) because it **re-rasterises the
  glyphs**, so it is exposed to the host now (`SetInnertaFontSize` /
  `GetInnertaFontSize`) and the node view drives it: when the wheel settles
  (debounced), each terminal is asked to draw at that resolution
  (`setRenderScale`). The canvas buffer and the font grow **together**, so
  `cols = width / charWidth` does not move and **the PTY never reflows**. The CSS
  transform keeps doing the layout, so the gesture stays fluid and the engine
  re-render happens once, on settle.
  Careful bit: changing the font size goes through `SetTheme`, which reloads the
  **editor's** font — and in a terminal view that **clobbers the monospaced one**
  (the cells end up wider than the glyphs, i.e. letters that look spaced out), so
  after resizing, the terminal's own font is applied again, which also
  recalculates the metrics at that size.
- **The terminal stops clipping the bottom of its glyphs — and stays tight**:
  `SetTerminalFont` overrode the line height with `fontSize * 1.1` — a guess that
  ignores the font's vertical metrics — while the glyph **bitmaps** are rasterised
  for the **atlas's** line height and centred in that cell. Any font whose ascent
  + descent is wider than 1.1 em (Cousine: 1.132 em, DejaVu: 1.164 em) ended up
  with a cell ~2.5 px shorter than its glyphs, so descenders and the bottom
  border of a TUI's boxes were cut. The cell's extra padding is a parameter of
  the atlas now (2 px for the editor, **0 for the terminal**), so it is tighter
  than the editor *and* the rasterisation uses that very same number — the cell
  can no longer come out shorter than the glyphs. Other terminals get away with
  "≈1.1 em" because there the cell and the rasterisation come from the same
  number; here they came from two.
- **The terminal's missing glyphs come from YOUR system now**: the engine's
  fallback chain was hardcoded, and in WASM only three **embedded** fonts existed
  (`Twemoji`, `Symbols`, `EmojiUpper`). So every glyph the primary lacks — box
  drawing `─`, blocks, braille `⠋`, powerline, arrows — was drawn by *our* fonts
  instead of the ones your terminal resolves, which is why they looked different
  from your machine. The main process now resolves the real chain, asking
  **fontconfig** — per code point — which font the system would use for each block
  a terminal needs (box drawing, blocks, braille, arrows, dingbats, powerline,
  emoji) and ordering the chain by how many of those each font wins, so the engine
  — which resolves in order — matches fontconfig. Windows has no fontconfig, so it
  uses the console font list. The engine takes the chain
  (`SetInnertaTerminalFonts`), replacing the fixed list. Fonts are read at
  runtime and live only in the WASM filesystem: **nothing is written to disk**, so
  they are re-resolved on every open and gone on close. Colour emoji now prefer
  the system's emoji font too, with the bundled Twemoji only as a last resort.
  Trade-off, said out loud: the chain is capped (≤6 MB per font, ≤24 MB total)
  because each terminal module loads its own copy, so CJK does not ride along.
  It is loaded **on demand** instead: the moment a CJK character (kana, han,
  hangul) reaches the PTY, the session asks the system for its CJK font, writes
  it into the engine's filesystem and appends it to the chain — once per session,
  so only the terminals that actually show CJK pay the tens of MB. The invariant
  is covered by a test that asks fontconfig which font wins for each sample code
  point and fails if the chain would pick another one (plus one for CJK).
- **Settings → Terminal**: a section to pick the terminal's font family (or leave
  it on the system default), listing the monospaced families the machine actually
  has. The choice is persisted and re-applied to every open terminal right away —
  the chain is re-resolved from the system, so nothing is re-opened or cached.
- **Emoji is emoji, symbols are symbols**: the terminal decided "is this an
  emoji?" by **range** (`U+2600..U+27BF` and friends), so plain Unicode symbols
  that CLIs print — `✓ ❤ ☀ ⚠ ℹ`, which have *text* presentation — were hijacked
  and drawn from the colour emoji font (or, when it did not have the glyph, from
  a proportional fallback), mixed in the same line with engine-drawn monochrome
  box-drawing and braille, each with different metrics. Now the decision is
  Unicode's: **`Emoji_Presentation`** decides, and the terminal draws emoji from
  the system's **colour** emoji font (Noto Color Emoji on Linux, Segoe UI Emoji
  on Windows) while everything else stays **monochrome** from the same chain as
  the rest of the text — the way kitty, wezterm, VTE and Windows Terminal do it.
  The emoji face is a slot of its own (`SetInnertaTerminalEmojiFont`), resolved
  by **family** (fontconfig's `:charset=` returns Unifont, a monochrome font,
  before the colour one), loaded **on demand**, and since colour emoji are
  bitmaps with a single 128 px strike that FreeType cannot resize, the engine
  downscales the bitmap to the cell. Cell width uses the same table, so `✓` and
  `❤` take one cell again and nothing shifts after them.
- **Variation selectors, and wide cells that drifted**: `⚠️` (VS16) asks for
  emoji and now gets it; `⚠︎` (VS15) asks for text and stays monochrome. Neither
  the selector nor wide cells were handled before. libvterm merges the selector
  into the cell and the parser threw it away, and a wide character left a
  `(uint32_t)-1` continuation cell that the renderer read as a real code point —
  so every CJK character and every astral emoji advanced **three** columns
  instead of two and the rest of the line drifted. The selector now travels with
  the cell, libvterm widens a `base + VS16` grapheme to two columns, the
  continuation cell is skipped, and the atlas caches glyphs per (presentation,
  code point) so `⚠` and `⚠️` can coexist. The native surface's width table —
  which counted East Asian *ambiguous* characters (`→ ─ ●`) as wide, unlike any
  default terminal — now uses the same table as the WASM build.
- **The terminal uses your terminal's font *and size* now**: the family came from
  `fc-match monospace` and the size from the editor's font minus one pixel, so a
  GNOME Terminal running JetBrains Mono NL at 10 pt (13 px) was drawn here in
  Cousine at 14 px — same relative advance but a cell 17 % shorter, and TUIs that
  mix `─` with `│` came out warped. The main process reads the machine's terminal
  font (Linux: `gsettings`, the GNOME Terminal profile or the system monospace
  font; Windows: the console registry) and its size (pt → px at 96 dpi, times the
  text-scaling factor), and the view is built with those metrics. The "one pixel
  less than the editor" fudge is gone.
- **Block characters no longer leave a hairline between rows**: TUI logos are
  built from block elements (`█ ▀ ▄ ▌ ▐` and the quadrants), and the font draws
  them a pixel short of the cell — JetBrains Mono NL at 13 px gives a 17 px
  block in an 18 px cell — so the background showed through between rows. The
  engine now draws them itself, filling the exact cell, the way VTE and kitty
  do. It also explains why the node viewer looked right around 147–159 %: that
  is where the zoom lands the font on 20 px, the size where the block happens to
  match the cell. Now it holds at every size.
- **TUI frames no longer have a "penumbra" at the joints**: same root cause as
  the blocks — the font's box-drawing glyphs are bigger than the cell (`─` is
  10 px wide in an 8 px cell, `│` is 20 px tall in an 18 px one), so every cell
  overlapped its neighbour and each joint kept an anti-aliased edge, which is
  why each segment looked like its own thing. The engine now draws the single
  line set itself (`─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼`, the heavy variants, the light/heavy
  mixtures and the rounded corners `╭ ╮ ╯ ╰`) as rectangles that go from the
  cell edge to the centre, which is what VTE and kitty do; the thickness is one
  device pixel and scales with the zoom. The double-line set, the dashes and the
  diagonals still come from the font.
- **The emoji decision belongs to the text, not to us**: the last place that
  converted a character to a colour emoji "because it is in a range" lived in the
  renderer, which rasterised `U+2600..U+27BF` (and friends) with the browser and
  pushed the bitmap to the engine — with Noto Color Emoji first. That is how a
  CLI's settings button (`⚙` U+2699, text presentation, no VS16) came out as a
  colour emoji and looked wrong. The browser raster is gone: the engine is the
  only one deciding, per code point, from `Emoji_Presentation` and VS16, and the
  renderer now just hands it the system's colour font (on demand, per view). One
  pipeline, and what the text says is what you see.
