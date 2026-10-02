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
