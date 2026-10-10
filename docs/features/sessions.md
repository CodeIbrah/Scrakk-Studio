---
title: "Sessions"
group: features
order: 110
summary: "Live sessions: a canvas plus an engine that must not die when its tab is hidden or moves slots. attach/detach/dispose."
---
# Sessions

A **live session** is the abstraction behind anything that owns a long-lived
renderer surface —an editor buffer, a terminal— and must **not** be destroyed when
its tab is hidden or moves to another slot. The contract lives in
`features/sessions/LiveSessionHost.tsx`.

## The contract

```ts
export interface LiveSession {
  attach(host: HTMLElement): void
  detach(host?: HTMLElement): void
  dispose(): void
  /** Render scale (optional; only the terminal uses it today). */
  setRenderScale?(scale: number): void
}
```

- **`attach(host)`** mounts the session's node into a host element and resumes
  rendering.
- **`detach(host?)`** pauses it and unmounts the node — but the **state stays
  alive**: the buffer, the undo history, the PTY and the WASM module keep living in
  the session.
- **`dispose()`** is the only thing that destroys everything (closing the tab).
- **`setRenderScale`** lets a consumer ask the engine to rasterise at a resolution
  (used by the terminal node view so a CSS zoom stays crisp instead of stretching
  the bitmap); it can be requested **before** the session starts and is applied
  when the canvas exists.

## The host

`LiveSessionHost` mounts a session and, on unmount, **only detaches**:

```tsx
export function LiveSessionHost({ session }: { session: LiveSession }) {
  const hostRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    session.attach(host)
    return () => session.detach(host)   // NOT dispose()
  }, [session])
  return <div ref={hostRef} className="live-session-host" />
}
```

The `host` is passed to `detach` so a **stale cleanup** (running after an `attach`
to another host, e.g. after moving the tab) does not tear down the current host.

## Who uses it

- **Terminal**: each terminal tab is a live session owning its canvas + Innerta
  view + PTY. Moving the tab between slots re-parents the canvas without killing
  the shell. See [Terminal](terminal.md).
- **Editor file sessions**: the file/document model behind the editor tabs (the
  engine is kept per panel; see [The editor](../editor/editor.md)).

## Why it exists

Innerta is a WASM engine: recreating it on every remount loses the buffer, the
undo and (for a terminal) the shell. A session keeps the engine/module alive and
only changes **where** it is mounted.

## Limits

- A session is renderer-scoped: it survives slot moves and tab switches, **not** an
  app restart.
- Detaching pauses rendering; a detached session still holds its memory until
  `dispose()`.

## Next steps

- [Terminal](terminal.md) — the main consumer of live sessions.
- [The editor](../editor/editor.md) — the editor's session/engine model.
