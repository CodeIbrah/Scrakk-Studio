---
title: "Social"
group: features
order: 100
summary: "The Social panel: friends, direct messages, presence and profiles, backed by per-account IPC and Supabase Realtime, plus file sharing."
---
# Social

The **Social** panel is the app's messaging surface: friends, **direct
messages**, presence, profiles and friend requests. It lives behind the `people`
icon in the activity bar and is backed by two renderer services plus Supabase over
IPC.

## Architecture

```
features/social (UI + state)  →  @services/social (per account)  →  main (IPC)  →  Supabase
                                        ▲
                                        └── Realtime events (tagged with the account)
```

- **`@services/social`** (`services/social/index.ts`) is **per account**: every
  call carries an `accountId`, so two panels can use two accounts.
- **`@services/account`** owns the signed-in accounts; the panel has an **account
  switcher** and an **auth gate** (email + code).
- Realtime events (new message, typing, presence, request, edit/delete) arrive
  tagged with their account and collapse into isolated state.

## What it does

- **Friends**: list, add by search (`searchMin: 2` chars), accept/reject requests,
  remove friends; a **requests** list and a badge.
- **Direct messages**: send (max `4000` chars), reply, edit, delete; **image**
  uploads; emoji picker; typing indicator; presence (`online`/`away`/… and an
  activity).
- **Profile**: view and edit (avatar picker, status) — profiles can also float
  over the app (`ProfileFloating`).
- **Shared files** ("code files"): a message whose `body` is only an **envelope**
  and whose content lives in **R2**; expanding it mounts a **read-only Innerta
  session** (see [The editor](../editor/editor.md)). Limits come from
  `SOCIAL_RULES`:

  | Rule | Value |
  |---|---|
  | `messageMax` | 4000 chars |
  | `slowmode` | 5 messages / 5000 ms (DB backstop: 7 / 5 s) |
  | `codeFileMaxLines` | 10 000 |
  | `codeFileMaxChars` | 512 KB |
  | `codeFileTtlDays` | 60 |
  | `codeFileQuotaPerConversation` | 15 |

- **Activity bar badge**: unread messages + pending requests.

## Behaviour details

- **Load on scroll**: opening a chat fetches the last page; earlier pages are
  requested only when you scroll up manually.
- **Position on open**: to the **last message**, or back to where you were reading
  recently (per-conversation scroll memory).
- **Slowmode**: the client blocks going over the window with a friendly message;
  the DB trigger is the loose backstop.
- **Realtime resilience**: reconnects with **backoff** (2 s → 30 s) and groups
  refreshes instead of reloading on every event (an expired JWT used to reconnect
  every 3 s).

## Limits

- Social needs an **account** and network (Supabase); with no session the panel
  shows the login gate.
- File sharing stores content in **R2** and expires (`codeFileTtlDays`); the body
  alone is not the message.
- Text selection in the chat was enabled; the rest of the shell stays
  unselectable.

## Next steps

- [Panels & features](README.md) — the other built-in panels.
- [The editor](../editor/editor.md) — the read-only Innerta session in a shared file.
- [Modes and permissions](../chat/permissions.md) — the chat that drives the agent.
