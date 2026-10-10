---
title: "Debug"
group: features
order: 60
summary: "The Debug panel today: a placeholder with no backend. What real debugging surfaces do exist (the LSP, the terminal, the run/debug tasks)."
---
# Debug

The **Debug** panel lives in the `debug` slot of the layout (opened from the
activity bar). Today it is a **placeholder**: it only sets its title and shows a
"not available yet" message. It is registered in `PANEL_REGISTRY` as `debug`
(`features/layout/panels/DebugPanel/DebugPanel.tsx`).

```tsx
// DebugPanel.tsx (today)
export function DebugPanel(): JSX.Element {
  const { setTitle } = usePanelTitle()
  useEffect(() => { setTitle(t('layout.panel.debug')) }, [setTitle])
  return <div className={styles.debug}>{/* placeholder */}</div>
}
```

## What does NOT exist

There is **no debugger**: no breakpoints, no call stack, no variables view, no
`contributes.debuggers` support. The VS Code contribution points `debuggers` and
`breakpoints` are classified as **missing** in the compatibility table (see
[VS Code compatibility](../extensions/architecture/vscode-compatibility.md)).

## What you CAN do today

Debugging-adjacent workflows that are real:

- **Diagnostics**: language servers and extensions surface errors/warnings in the
  [Problems](problems.md) panel and underlined in the editor.
- **Terminal**: run debuggers/REPLs from the [Terminal](terminal.md) (a real PTY).
- **Commands / tasks**: run build/test/lint commands from the editor's command
  integrations and terminal.

## Limits

- The panel is a shell; it is not wired to any backend.
- No DAP (Debug Adapter Protocol) client exists.

## Next steps

- [Panels & features](README.md) — the other built-in panels.
- [Problems](problems.md) — diagnostics from servers and extensions.
- [Terminal](terminal.md) — running processes and REPLs.
