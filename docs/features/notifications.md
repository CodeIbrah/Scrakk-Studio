---
title: "Notifications"
group: features
order: 180
summary: "The notification centre: notify() with severities, default timeouts, up to three actions, the draining line, history, and the LSP/extension sources."
---
# Notifications

Notifications are transient in-memory cards that appear in one of the four
screen corners. The app and extensions use the **same** API
(`notify()` from `@services/notifications`), and one host
(`features/notifications/NotificationHost.tsx`) paints them. A capped history of
dismissed cards is available from the status bar's bell button.

## The API

```ts
import { notify } from '@services/notifications'

notify({
  title: 'Language Server: typescript',
  message: 'Server crashed',
  severity: 'error',        // info | success | warn | error (default 'info')
  corner: 'br',             // tl | tr | bl | br (default 'tr')
  timeoutMs: 12000,         // 0 = persistent; omitted = default by severity
  actions: [                // max 3, each with an arbitrary callback
    { label: 'Ver servidores', run: () => openSettingsModal('servers') }
  ],
  onClose: () => { /* called if dismissed without choosing an action */ }
})
```

Return value is the notification `id`; pass it to `dismissNotification(id)` to
close it programmatically.

### Default timeouts

`notify()` fills in `timeoutMs` from `DEFAULT_TIMEOUT_MS` when it is omitted:

| Severity | Default |
|---|---|
| `info` | `6000` ms |
| `success` | `6000` ms |
| `warn` | `8000` ms |
| `error` | `10000` ms |

`0` (or an explicit `0`) means **persistent**: the card stays until the user
closes it. The extension host forces `0` for messages that carry buttons, so a
`showInformationMessage` caller does not lose its answer to an auto-dismiss.

### Images

An optional `image` renders an `<img>`; `width` and `height` are clamped to
500px and `rounded` defaults to `true`.

## The host

`NotificationHost` is mounted once in the app shell. It filters the registry by
corner (`tl`, `tr`, `bl`, `br`) and renders one stack per non-empty corner. Each
card has a severity glyph (`ℹ`, `✓`, `⚠`, `✕`), the title, optional `message`
and `detail`, an optional image, up to three action buttons, and a close button.

Action buttons run their callback and then dismiss the card. The close button
only dismisses. A thin line at the bottom is coloured by severity: with a
timeout it drains over exactly that duration
(`style={{ animationDuration: timeoutMs }}`); persistent cards keep it full.

## Registry and history

`notificationRegistry` (`services/notifications/registry.ts`) keeps the active
cards in a `Map`, plus `onClose` callbacks and a ring of dismissed entries.
`MAX_ACTIONS` is `3`. `dismiss(id)` moves a snapshot to the history ring
(`MAX_HISTORY` = `50`, newest first) with its actions stripped, then runs the
`onClose` callback **after** emitting.

The bell button in the [status bar](status-bar.md) opens the history as an
anchored modal:

```ts
showAnchoredModal({
  key: 'notifications-history',
  render: () => <NotificationsHistoryPanel />
})
```

`NotificationsHistoryPanel` lists **activas** (with a per-row dismiss) and
**historial** (read-only, with a "Limpiar" button calling
`clearNotificationHistory`). Empty state shows "Sin notificaciones todavía".
Helper exports: `listNotifications`, `notificationHistory`,
`clearNotificationHistory`, `subscribeToNotifications`.

## What raises notifications

- **LSP** (`features/lsp/LspNotificationsBridge.tsx`): a server entering
  `failed` raises an `error` in the bottom-right corner with a 12 s timeout and
  two actions (`Ver servidores`, `Reiniciar`). Repeated identical
  `serverName:error` pairs are deduped until the server reaches `ready`.
  `notifyInstallResult` raises a 5 s `success` or an `error` with a
  `Ver servidores` action.
- **Extension host** (`services/extensions/hostBridge.ts`): the `notify` invoke
  path turns `vscode.window.show*Message` into `notify()`. Action labels are
  trimmed, capped at three, and force a persistent card; `onClose` resolves the
  extension's promise with no `actionIndex`.
- **The app itself** uses the same API for everyday feedback — source control
  success/errors (`services/git/store.ts`), update checks
  (`services/updates`), editor screenshots, the file close guard, definition
  lookups, and social file sharing.

## Limits

- Notifications are **not persisted**: a reload loses both active cards and
  history.
- History entries store no actions or `onClose`, so a dismissed action cannot be
  re-run from the history panel.
- Images are clamped to 500×500; there is no dismiss-all and no native OS
  notification or sound.
- `notify()` is fire-and-forget; use `onClose` (not a return value) to learn
  that a card was dismissed without a chosen action.

## Next steps

- [Status bar](status-bar.md) — the bell button and Problems/Git/LSP chips.
- [Problems](problems.md) — diagnostics that often trigger error cards.
- [Extensions](../extensions/README.md) — where host notifications come from.
- [Layout & panels](layout.md) — where the host is mounted.
