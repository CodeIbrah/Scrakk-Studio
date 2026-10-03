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
- **Every message now has copy AND edit**: the action bar existed only for the
  assistant's final text and only to copy. It is now on **both** roles and
  gained an **edit** button that turns the bubble into an inline editor (save
  with the button or Cmd/Ctrl+Enter, cancel with Escape). The bar sits **below**
  the bubble: it used to be inside it, so on the user's message the icons landed
  on the bubble's colored background. The row is now a stack (bubble + actions)
  — which also moved the user's 60% width cap to the stack and the assistant's
  "fill the row" to it, so both the cap and the table fix keep holding. The
  inline editor follows the composer's rule: the textarea itself has **no**
  border, background or resize handle — the frame lives on a container and only
  shows on focus (the native resize grip drew a corner the box did not need).
  Saving is functional,
  not decorative: editing a **user** message updates it and **re-sends** — what
  followed answered a text that no longer exists, so it is dropped and the
  answer is re-requested, the same criterion as Regenerate — while editing an
  assistant message only updates its text. The handler is passed to every
  bubble, so it reads the live messages through a ref: depending on `messages`
  would change its identity on every streamed token and defeat the bubble memo,
  re-parsing the whole history per token.
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
