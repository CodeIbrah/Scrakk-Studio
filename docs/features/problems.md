---
title: "Problems"
group: features
order: 70
summary: "The Problems panel: the merged list of diagnostics from language servers and extensions, with severity filters and click-to-navigate."
---
# Problems

The **Problems** panel lists the IDE's diagnostics —the errors and warnings from
**language servers** and from **extensions**— grouped by file and clickable to
jump to the exact position.

It is a normal panel (`PANEL_REGISTRY` id `problems`,
`features/layout/panels/ProblemsPanel/ProblemsPanel.tsx`) that can live in any
slot; the status bar's counts chip opens it (typically in the bottom slot):

```ts
toggleSlotPanel('bottom', 'problems')
```

## One store, two channels

Diagnostics arrive through two channels and land in the **same** store
(`@services/lsp/diagnosticsStore`):

1. **Language servers**: `publishDiagnostics` → main → `lsp:on-diagnostics`.
2. **Extensions**: `vscode.languages.createDiagnosticCollection(...).set()` → host
   → `diagnostics/change`.

The store keeps **one entry per source**, so an extension linter's error and
`tsc`'s error on the same line are **two problems**, not one overwriting the
other. The panel reads them **aggregated**.

## What the panel shows

Each **group** is a file (collapsible). Each **row** is a diagnostic:

| Column | What |
|---|---|
| icon + color | severity (`1` error red, `2` warning amber, `3` info blue, `4` hint muted) |
| message | the diagnostic's message |
| origin | `diagnostic.source`, or the publishing source's name when it does not set one |
| code | the diagnostic's `code`, if any |
| `line:col` | `start.line + 1 : start.character + 1` (1-based, for people) |

- **Severity filters**: 4 toggle buttons, each with the count **over everything
  known** (not just the visible rows).
- **Text filter**: matches `message` + `origin` + `code` + file path (case
  insensitive).
- **Click a row**: opens the file and reveals the position. The editor engine
  loads lazily, so `revealInnertaPosition` is **retried for up to 2 s** (every
  60 ms) instead of losing the jump.
- The active file's group is highlighted.

## Where the underlines come from

The panel does **not** underline anything in the editor. The underline is painted
by the engine through the decorations channel
(`services/lsp/decorations.ts` → `@services/decorations` → Innerta). The panel
**lists**, the editor **shows**, and both read the **same store** so they cannot
disagree. See [Editor decorations](../editor/decorations.md).

## Limits

- Only **ERROR/WARNING** are exposed to the agent-facing paths
  (`drainDiagnostics` / `readDiagnostics` / the `<lsp-diagnostics>` block); the
  **panel** shows all four severities.
- Diagnostics come from servers/extensions; the panel does not compute any of its
  own (except the counts).
- A source that never clears its collection keeps its last diagnostics until it
  publishes an empty list (the same contract as VS Code).

## Next steps

- [Panels & features](README.md) — the other built-in panels.
- [Editor decorations](../editor/decorations.md) — how the underlines are painted.
- [LSP API](../lsp/api.md) — the diagnostics store and the agent-facing reads.
