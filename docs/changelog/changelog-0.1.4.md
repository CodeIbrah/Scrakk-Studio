---
title: "Changelog 0.1.4"
group: changelog
order: 40
summary: "Relevant changes in Scrakk Studio. The welcome screen shows the first entry (the newest) in the Announcements section, so the newest goes on top."
---
# Changelog

Relevant changes in Scrakk Studio. The **welcome screen** shows the first
entry (the newest) in the **Announcements** section, so the newest goes on top.

Format: `## <version> — <title>` and bullets per area. Entries already
published are not edited. The file goes per version:
`docs/changelog/changelog-<x.y.z>.md`.

---

## 0.1.4 — TBD

### Editor (UI)
- **The mouse cursor turns into the normal arrow over the scrollbar**: the
  scrollbar is painted **on top of the text**, so the engine's text hit-test
  answered "there is a line here" and the host kept the I-beam over the thumb
  and the track. There is now an `InnertaIsOverScrollbar` export (vertical and
  horizontal, thumb and track) and the bridge consults it **before** deciding
  the cursor, so hovering the scrollbar shows the arrow and also skips the
  language hover — `GetInnertaTextXOffset` alone could not tell them apart,
  because the scrollbar sits to the right of where the text starts.
- **The editor's context menu no longer offers "Formatear documento"**: the
  item is gone, along with the LSP `TextEdit` application code it was the only
  caller of. It replaced the whole buffer with `setContent`, which resets the
  editor's undo — it can come back when ranged edits land without that cost.
- **The titlebar's Edit menu finally acts on the editor**: it called
  `document.execCommand(...)`, which works on the DOM and **not** on the
  editor's canvas, so Copy/Paste/Select All did nothing with a file open. The
  items now run through the editor's own actions (shared with the context menu
  via a new `editorActions` module): **Copy/Cut** write the selection to the
  system clipboard (the engine's `Ctrl+C` fills its *internal* one), **Paste**
  loads the system clipboard and only then sends `Ctrl+V`, and **Undo/Redo/Cut/
  Select All** send the engine's own combos (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+X`,
  `Ctrl+A`). When the focus is a text field — the chat, a search box — the menu
  keeps the old DOM behaviour, so the editor's actions do not steal the copy
  that was meant for the field.

### Editor — indent guides (engine)
- **The guides no longer keep the previous file's columns, and they sit one
  indent to the left of the text instead of on top of it**: two bugs, one on
  top of the other. The engine computed the number of guides as a **level**
  (`spaces / tabSize`) and painted each guide at `(level - 1) * tabSize`, so the
  unit was whatever `tabSize` happened to be: a file indenting with 2 spaces in
  a 4-space language came out with **no guides at all** (2 / 4 = 0) and tabs
  were counted as one space each. Worse, a later pass moved each guide to
  `unit * n` (its `1-based` index), which put the innermost guide **on the first
  letter of the line**. It now counts the **visual column** of the indentation
  (a `\t` jumps to the next tab stop, a space adds 1) and draws
  `ceil(column / unit)` guides at `k * unit` (`k` from 0) — the exact rule
  **VS Code** and **Zed** use (`Math.ceil(currentIndent / indentSize)`), so the
  innermost guide always lands one unit to the **left** of the text, never over
  it, and a 2-space line inside a 4-space file still gets its outer guide. The
  unit is the **language's indent unit** the host sends through
  `SetInnertaIndentUnit` (2 spaces, 4, or a tab), with `tabSize` as the fallback
  for tabs, and the active block's highlight is measured the same way. The
  second bug was the stale cache: the guides were recomputed only when
  `m_bufferModified` was set, and **switching tabs does not touch that flag** —
  `RestoreSessionState` swaps the buffer in directly — so the columns of the
  file you just left stayed on screen until the next keystroke. The editor now
  marks the guide cache dirty on `SetText`, on every edit, on a language change,
  on a session switch, and when the indent unit itself changes, and recomputes
  from the buffer it has in front of it.
- **A tab is a tab stop, so the guides and the text share one width**: the
  layout advanced a `\t` by **one cell**, like any control character, while the
  guides expanded it to `tabSize`. In a tab-indented file — Go, Make, Dockerfile
  — the text therefore sat `tabSize` cells to the left of where the guide
  assumed it was, and the innermost guide **crossed the first letters**. The
  layout now advances a `\t` to the **next tab stop** and every x position goes
  through the same rule (`WidthBefore`, `HitTestTextPosition`/`HitTestTextRange`,
  `HitTestPoint` and `DrawTextLayout`), driven by the language's `tabSize`, so
  the caret, the selection, the underlines and the guides all agree. As a
  bonus, a tab-indented file finally shows its real indentation instead of one
  column per tab. Covered by a native harness (one/two/three tabs, a tab after
  spaces, `tabSize` 2, and the inverse mouse hit-test).
- **Indentation folding uses the real unit too**: the fold heuristic divided by
  a hardcoded 4, so a file indenting with 2 spaces had no foldable blocks by
  indentation. The folding manager now takes the language's indent unit, the
  same one the guides use.
