---
title: "Supported protocol and limits"
group: lsp
order: 60
summary: "Which parts of the LSP handshake and protocol Scrakk supports, and what is left out."
---
# Supported protocol and limits

LSP is JSON-RPC 2.0. Here is what Scrakk implements of the protocol and what it
does not.

## Handshake

`initialize` with:

- `processId`, `rootUri` + `rootPath` + `workspaceFolders` (of the owning root, or
  the server config's `workspaceFolder` override).
- Declared capabilities (the server does NOT offer what is not declared):
  - synchronization didOpen/didChange/didSave
  - publishDiagnostics (relatedInformation, versionSupport)
  - hover plaintext/markdown · definition linkSupport:false · references
  - documentSymbol hierarchical:true
  - completion: resolveSupport (documentation, detail, additionalTextEdits),
    labelDetails, contextSupport
  - signatureHelp documentationFormat
  - **semanticTokens** requests range+full{delta}
  - **inlayHint** resolveSupport (tooltip, textEdits)
  - codeAction literal + dataSupport · callHierarchy · foldingRange ·
    selectionRange · documentHighlight · rename prepareSupport

Then: `initialized` → `didChangeConfiguration` with `settings` if any.

## Document sync

The synchronization modes:

| Mode | When | What is sent |
|---|---|---|
| Incremental | the server declares `textDocumentSync.change = 2` | ONE range edit (minimal prefix/suffix diff) |
| Full-text | the rest | the full `{ text }` |

Both with an increasing version per document and `didSave` ALWAYS afterwards (some
servers publish diagnostics only on save). The current content stays cached in the
client to compute diffs.

## Requests and timeouts

- Default request 30 s; configurable per call.
- Multi-server aggregated responses; each entry carries its serverName.
- `completionItem/resolve` and `inlayHint/resolve` must go **targeted**
  (`serverName`) because the result depends on the server that emitted the item.

## Progress ($/progress)

- `window/workDoneProgress/create` → registers the token.
- `$/progress` begin/report/end → broadcast to the windows (`lsp:on-progress`)
  with serverName/token/phase/message/percentage.

## Diagnostics

- `publishDiagnostics` → a map by absolute path (multi-server) + broadcast.
- Drain semantics: a server "reports" when it PUBLISHES for the path, even if
  empty (presence in the map, same as the CLI).
- Only ERROR/WARNING are exposed in drain/readDiagnostics/the formatted block.

## What is NOT there yet (honest limits)

- **Delta tokens**: the capability is declared but `delta` is not requested on a
  previous `resultId` (full on every request).
- **Partial results** (`partialResultToken`): requests do not stream partial
  results; they wait for the final response.
- **didChangeWatchedFiles**: the capability is declared but the runtime does not
  emit notifications for external changes (git pull, edits outside). Buffers
  refresh when the host touches the file.
- **willSave/willSaveWaitUntil, onTypeFormatting, linkedEditing, colorProvider,
  monikers, typeHierarchy**: not implemented.
- One server = one root per instance (no servers shared between roots).

## Timeouts and budgets

The numbers:

| Concept | Value |
|---|---|
| initialize | 15 s (configurable) |
| shutdown | 5 s (configurable) |
| request | 30 s |
| drain diagnostics | 500 ms |
| readDiagnostics settle | 2 s |
| install | 300 s |
| workspace scan (install gate) | 8000 entries |
| restart backoff | 1 s ×2^n up to 30 s |
