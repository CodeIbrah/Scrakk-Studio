---
title: "Settings"
group: features
order: 140
summary: "The Settings area: how sections are registered and opened, and what every section controls."
---
# Settings

**Settings** is a registry-driven area: each section is a component registered
with nav metadata (id, label key, icon, optional parent) in
`features/settings/sections/index.ts`. Adding a section is creating its folder and
adding one entry —the shell does not change.

## Sections

| Id | Section | What it controls |
|---|---|---|
| `appearance` | Appearance | Theme (color/light-dark), fonts/background |
| `editor` | Editor | Editor options |
| └ `servers` | Servers | LSP servers (on/off; see the [LSP](../lsp/README.md)) |
| └ `highlight` | Highlighting | Grammar engine (`auto`/`treeSitter`/`textMate`); see [Languages](../editor/languages.md) |
| `terminal` | Terminal | Terminal font family/size; see [Terminal](terminal.md) |
| `extensions` | Extensions | Install `.sef`/`.vsix`, enable/disable, uninstall, icon themes; see [Extensions](../extensions/README.md) |
| `performance` | Performance | Performance-related toggles |
| `chat` | Chat | AI chat options |
| └ `chatProviders` | Providers | Models/providers (models.dev); see [Models & providers](../chat/providers.md) |
| └ `chatTools` | Tools | Enable/disable each AI tool; see [AI tools](../chat/tools.md) |
| └ `chatSkills` | Skills | Enable/disable each skill |
| └ `chatAgents` | Subagents | Subagent settings; see [Subagents](../chat/subagents.md) |
| └ `chatPermissions` | Permissions | Allow/ask/deny rules; see [Modes and permissions](../chat/permissions.md) |
| `info` | About | Version, build, check for updates; see [Updates](../updates.md) |

Rows with a parent render as **collapsible children** of that section.

## How it opens

The app opens Settings by dispatching a DOM event:

```ts
window.dispatchEvent(new CustomEvent('open-settings', { detail: { section: 'extensions' } }))
```

The VS Code command `workbench.action.openSettings` maps to it; a query containing
`@ext:` opens the **Extensions** section (that is how an extension's notification
button lands on the right tab).

## Persistence

Settings persist through `@services/storage` (localStorage keys such as
`scrakk-studio:*`), each section storing its own slice; sections subscribe to
changes so the UI follows the active language and theme.

## Limits

- There is **no settings search** across sections yet (VS Code has one).
- Settings are per-machine (localStorage); no settings sync.

## Next steps

- [Panels & features](README.md) — the other areas.
- [Extensions](../extensions/README.md) — the Extensions section in depth.
- [Modes and permissions](../chat/permissions.md) — the Permissions section in depth.
