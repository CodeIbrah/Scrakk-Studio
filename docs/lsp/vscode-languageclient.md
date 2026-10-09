---
title: "VS Code extensions that bring their own language server"
group: lsp
order: 100
summary: "How a VS Code extension that brings its own `LanguageClient` runs in the Extension Host and its providers (hover, definition…) reach the editor."
---
# VS Code extensions that bring their own language server

In VS Code a language server **is not a contribution point: it is code**. The
extension does `new LanguageClient(...)` in its `activate`, and all the negotiation
(initialize, capabilities, document sync, diagnostics, requests) is carried by the
`vscode-languageclient` package.

Scrakk does not reimplement that package: it **runs the real one**. What the IDE
provides is the `vscode` API the library consumes, exactly as VS Code does.

```
extension (bundle) ──require('vscode-languageclient/node')──┐
                                                            ↓
                                       the REAL lib (npm)  ←──┐
                                                            │  require('vscode')
                                                            ↓
                              Extension Host ── API shim (vscodeApi.ts)
```

## How the package is resolved

Two cases, and the precedence matters:

| Case | What happens | Why |
|---|---|---|
| **The extension bundles it** (webpack/esbuild) | the `require` comes from its bundle; only `vscode` is intercepted by the host | it is ~90% of real extensions and needs nothing from us |
| **It declares it as an external dependency** and does not bring it installed | the host answers with **its** copy (`vscode-languageclient` is an app dependency) | without this the extension died with `Cannot find module` |

The **extension's** copy always wins (it is its pinned version); the host's is the
fallback. The log warns only when the fallback is used, and it **only answers for a
`MODULE_NOT_FOUND` of the requested specifier**: if the extension brings the
package and what is missing is one of its dependencies, the error propagates
instead of being masked by our copy.

Implementation: `src/main/extensions/host/languageClientBridge.ts` + the
interceptor in `installVscodeResolver` in `hostProcess.ts`.

## Two layer bugs this exposed

The real lib fails FAST and with exact messages, so it ran as a compatibility test
of the shim. It found two things no panel extension had touched:

1. **`vscode.version` reported the APP version.** The library uses it as a gate:
   `The language client requires VS Code version ^1.82.0 but received version 0.1.0`
   → **every** extension with an LSP died while building its client, with a message
   that talks about VS Code and says nothing about the host. Now `vscode.version` is
   the API version (`@shared/compatibility/apiVersion`), which is what the field
   promises in VS Code; the app version is still reported in `env.version`.
2. **`languages.match` was a stub returning `null`.** The lib uses it to decide
   whether a document falls in the server's `documentSelector` (`features.js` asks
   `> 0`): with the stub, no document matched and the server **never received a
   `didOpen`** — the LSP started and never saw a file. It is real now (language,
   scheme and glob; an empty selector matches, like in VS Code).

## A protocol detail that costs an afternoon

With `TransportKind.stdio` the library **appends `--stdio` to the process `args`**:

```js
// vscode-languageclient/lib/node/main.js
if (transport === TransportKind.stdio) { args.push('--stdio') }
```

That is why the server is launched as a file (`node server.js --stdio`) and not
with `node -e "<code>"`: with `-e` the `--stdio` falls into Node's option parsing
(`bad option`) and the child dies before the handshake — which, on the client side,
looks like an `EPIPE` on the first `initialize` (a symptom that does not point to
its cause).

## How to verify it

It is verified with a real probe against the app:

```bash
npx vitest run tests/language-client-bridge.test.ts
```

The test runs the REAL host (`createHostRuntime`, with the module interceptor
installed), loads a fixture extension from disk that does
`require('vscode-languageclient/node')`, and that extension starts its client
against a real LSP server (child process, `Content-Length` framing) and sends it a
request of its own. If that passes, the whole chain works: resolution + shim +
handshake + round trip.

There is also a discovery harness to measure which API surface the library touches
when it is upgraded:

```bash
node tools/_probe-languageclient.mjs
```

## How someone adds their language server (the three paths)

Three paths, without touching the core:

| Path | Who uses it | Status |
|---|---|---|
| `.scrakk/lsp.json` (project or `~/.scrakk/lsp.json`) | someone who does not write an extension | ✅ `command`/`args`/`extensions`/`rootMarkers` |
| `contributes.lspServers` (SEF) | a declarative Scrakk package | ✅ see [extensions.md](extensions.md) |
| **A VSIX with `vscode-languageclient`** | a VS Code extension as-is | ✅ the server starts (this page) |

## How providers reach the editor

The library does not answer requests "on its own": it registers them as **providers
of the `vscode` API** (`languages.registerHoverProvider(selector, provider)` and
friends) and waits for the editor to query it. That was the cut: the server
started, received `didOpen`… and nobody asked it anything.

```
editor (hover) → services/lsp → IPC `lsp:request`
   ├─ LspManager   (system server or from .scrakk/lsp.json)
   └─ providerBridge (main) → each Extension Host → its real provider
                              └─ if the extension uses LanguageClient, it is the client
                                 that answers (talking to ITS server)
```

- **Host**: `src/main/extensions/host/languageProviders.ts` registers and queries
  for real (with `documentSelector`), and serializes the result to the LSP shape
  (the one the editor already knows how to paint).
- **Main**: `src/main/extensions/providerBridge.ts` translates the LSP request into
  a query and asks all the live hosts (those that do not answer do not appear).
  There is a timeout: a hung provider does not freeze the hover.
- **Queryable today**: hover, definition, declaration, implementation, type,
  references, occurrences highlight, formatting and range formatting. The IDE
  already PAINTS hover, definition and formatting; the rest answer and wait for
  their UI.
- **Still inert** (they register, warn in the log and are not queried): completions,
  signature, code actions, code lens, links, folding, semantic tokens, inlay hints
  and the hierarchies. There is no UI for that result.

## Diagnostics: now they are SEEN

The client publishes `publishDiagnostics`, the host registry (`diagnostics.ts`)
stores them and PUSHES them to the main (`diagnostics/change`), and the renderer
lists them: the **Problems** panel (including the status-bar chip, with the counts
per severity). They share a store with the LSP's
(`services/lsp/diagnosticsStore.ts`), with one entry per source, so an extension's
linter and `tsc` do not overwrite each other.

Diagnostics are underlined in the editor: they enter through the same channel as
decorations (see [../editor/decorations.md](../editor/decorations.md)).

## Limits (stated, not hidden)

- **The server is a child of the HOST, not of the IDE's LSP manager.** The lifecycle
  (state, restart, auto-install, the UI button) lives in `src/main/lsp`, and a
  client the extension starts does not go through it. Unifying the two paths is the
  natural next step.
- **`TransportKind.ipc` / `pipe` / `socket`**: the library supports them on its own
  (it spawns itself), so they work like stdio; what is NOT measured yet is a server
  that negotiates `workspace/configuration` with real IDE settings.
- **Extensions that are ONLY a server** (rust-analyzer, pyright, clangd from VS
  Code) still need their binary to exist: the IDE does not install their
  dependencies for them (that is what the `lspServers` path does with `install`).

## MIGRATION TO OWEAR (read before touching)

The bridge knows no Electron, no stdio, and no module system beyond the
interceptor. When Owear replaces the runtime: `languageClientBridge.ts` is kept or
thrown away whole, and the only thing to rewrite is `installVscodeResolver` (the
same point already marked for that).
