---
title: "Language servers"
group: extensions
order: 110
summary: "Declaring a language server (lspServers) and making it run: fields, priority and install recipes."
---
# Language servers

An extension can contribute a **language server** declaratively, just like the
core builtins. The real registration happens in the **main** process, which
syncs it with its runtime; the renderer only consumes its state.

```json
{
  "lspServers": [
    {
      "id": "acme-ls",
      "command": "acme-ls",
      "args": ["--stdio"],
      "extensions": { ".acme": "acme", ".acmex": "acme" },
      "rootMarkers": ["acme.config.json", ".acme"],
      "gatedBy": "acme.enabled",
      "install": { "kind": "npm", "package": "acme-language-server" },
      "initializationOptions": { "lint": true }
    }
  ]
}
```

| Field | Type | Required |
|---|---|---|
| `id` | global string | yes |
| `command` | string | yes |
| `args` | string[] | no |
| `extensions` | `Record<extension, languageId>` | yes |
| `rootMarkers` | string[] | no |
| `gatedBy` | string (a context key) | no |
| `install` | recipe | no |
| `initializationOptions` / `settings` | object | no |

`install.kind` ∈ `npm` \| `go` \| `gem` \| `dotnet` \| `github` \| `custom`. If the
server brings its own binary inside the package, use a `command` with the absolute
path resolved from the package (the host receives `extensionPath`).

## Priority

When several sources declare a server for the same language, the winner is:

```text
user  >  project (.scrakk/lsp.json)  >  dynamic (extensions)  >  builtin
```

So an extension's `.lspServers` **does not override** the user's or the project's
explicit configuration.

## The two runtimes

A server can live in two places (and Scrakk joins them):

1. In the main's **`LspManager`** (a system server or one installed by recipe).
2. Inside the **Extension Host**, if the extension started it with
   `vscode-languageclient` (or contributes providers without a server).

The main's `providerBridge` queries the hosts and **adds** their answers: whether
your server responds to hover/definition does not depend on the `LspManager`
knowing it.

## Notes

- `rootMarkers` defines the project root for that language (like VS Code).
- `gatedBy` is a context key (`setContext`): the server is only considered if the
  key is truthy.
- The server's diagnostics enter the **Problems** panel just like the system LSP's.

## Next steps

- [LSP system](../../lsp/README.md) — the main runtime.
- [Extension `lspServers`](../../lsp/extensions.md) — the detail in the LSP area.
- [vscode-languageclient](../../lsp/vscode-languageclient.md) — extensions that
  bring their own server.
