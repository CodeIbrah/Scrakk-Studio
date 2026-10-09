---
title: "Server configuration — `.scrakk/lsp.json`"
group: lsp
order: 40
summary: "The system loads the SAME config as scrakk-cli: two JSON layers merged by server name (the project wins over the user)."
---
# Server configuration — `.scrakk/lsp.json`

The system loads the SAME config as scrakk-cli: two JSON layers merged by server
name (the project wins over the user).

## Layers and priority

Who wins when several layers are configured:

| Priority | Layer | Path |
|---|---|---|
| 1 (highest) | Project | `<root>/.scrakk/lsp.json` |
| 2 | User | `~/.scrakk/lsp.json` |
| 3 | Dynamic | SEF extensions with `contributes.lspServers` |
| 4 (lowest) | Builtins | the automatically detected catalogue |

Rules:
- Each layer only **fills gaps**; user and project override each other by name, and
  **the project wins**.
- An invalid entry is dropped with a warning; it never crashes the boot (identical
  tolerance to the CLI).
- The user home is `~/.scrakk` — overridable with `SCRAKK_HOME` (tests).

## A server's format

A server looks like this:

```jsonc
// <root>/.scrakk/lsp.json
{
  "typescript": {
    "command": "typescript-language-server",
    "args": ["--stdio"],
    "transport": "stdio",              // stdio (default) | socket ("host:port")
    "env": { "TS_TSC_WATCHFILE": "NodeJs" },
    "extensions": {
      ".ts": "typescript",
      ".tsx": "typescriptreact"
    },
    "initializationOptions": {},
    "settings": {},                     // → workspace/didChangeConfiguration
    "workspaceFolder": "/alternative/path",  // optional: the server's own root
    "startupTimeout": 15000,
    "shutdownTimeout": 5000,
    "restartOnCrash": true,
    "maxRestarts": 3
  }
}
```

Accepted aliases (CLI compatibility): `extensionToLanguage` /
`extensionToLanguageId`, camelCase for all the timeouts/flags.

Normalizations:
- Extensions may come without a dot (`ts` → `.ts`) and in any case.
- Without `extensions` the server is registered but will never route files
  (warning in the console).

## Defaults (identical to the CLI)

The default values if you do not change them:

| Parameter | Default |
|---|---|
| startupTimeout | 15 000 ms |
| shutdownTimeout | 5 000 ms |
| request timeout | 30 000 ms |
| drain diagnostics | 500 ms |
| maxRestarts | 3 |
| backoff restart | 1 s → 30 s exponential |
| idle shutdown | 5 min with no open documents (`SCRAKK_LSP_IDLE_MS`) |

## Socket transport

With `"transport": "socket"` the `command` field is `"host:port"` and the client
connects over TCP instead of spawning. Useful for servers already running outside.

## Multi-server example

Two servers serving the same files:

```jsonc
{
  // Language + linter serve the same files (aggregated responses).
  "typescript": { "command": "typescript-language-server", "args": ["--stdio"],
                  "extensions": { ".ts": "typescript", ".tsx": "typescriptreact" } },
  "eslint":     { "command": "vscode-eslint-language-server", "args": ["--stdio"],
                  "extensions": { ".ts": "typescript" } },

  // A remote server already up.
  "remote-py":  { "command": "127.0.0.1:2087", "transport": "socket",
                  "extensions": { ".py": "python" } }
}
```
