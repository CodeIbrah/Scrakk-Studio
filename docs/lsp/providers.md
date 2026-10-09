---
title: "Language providers (host ⇄ IDE)"
group: lsp
order: 70
summary: "How a VS Code extension's language providers (hover, definition, formatting) reach the editor: from `registerXProvider` to the editor, over IPC."
---
# Language providers (host ⇄ IDE)

A language's problems can be solved in two ways in Scrakk:

1. **A system server** (or one installed by recipe) with declarative config
   (`~/.scrakk/lsp.json`, `<root>/.scrakk/lsp.json`, `contributes.lspServers`).
   That path is handled by the `LspManager` and documented in
   [architecture.md](architecture.md).
2. **A VS Code extension** that starts its server with `vscode-languageclient`
   —or that contributes the computation without a server, like a linter.

The second way is not config: it is CODE that registers **providers** on the
`vscode` API (`languages.registerHoverProvider(selector, { provideHover })` and
friends). This document explains how those providers reach the editor.

## The full path

The journey, end to end:

```
editor (hover / go to definition / format)
  └─ services/lsp (api.ts)                 renderer
       └─ IPC `lsp:request`                 preload
            └─ src/main/lsp/index.ts        main: joins the TWO sources
                 ├─ LspManager.request()    system servers
                 └─ queryExtensionProviders()  ← providerBridge.ts
                        └─ each live Extension Host
                             └─ provider/query   (hostProcess.ts)
                                  └─ LanguageProviderRegistry.query()
                                       └─ the extension's REAL provider
```

Both sources' answers are merged into the same list
(`LspRequestResponse.results`), with `serverName` = the server's name **or the
extension's id**. The editor does not tell them apart: it paints whatever arrives.
It is exactly what VS Code does with several providers on the same selector.

## What is queried today

Which methods answer today:

| Type | Provider method | Painted by the IDE |
|---|---|---|
| `hover` | `provideHover` | ✅ editor tooltip |
| `definition` | `provideDefinition` | ✅ (context menu / shortcut) |
| `formatting` | `provideDocumentFormattingEdits` | ✅ (LSP client; no context-menu entry) |
| `declaration` | `provideDeclaration` | ❌ answers, no UI |
| `typeDefinition` | `provideTypeDefinition` | ❌ answers, no UI |
| `implementation` | `provideImplementation` | ❌ answers, no UI |
| `references` | `provideReferences` | ❌ answers, no UI |
| `documentHighlight` | `provideDocumentHighlights` | ❌ answers, no UI |
| `rangeFormatting` | `provideDocumentRangeFormattingEdits` | ❌ answers, no UI |

**Not queried yet** (they register, return a `Disposable` and warn ONCE in the log,
with the API name): `registerCompletionItemProvider`,
`registerSignatureHelpProvider`, `registerCodeActionsProvider`,
`registerCodeLensProvider`, `registerDocumentLinkProvider`,
`registerFoldingRangeProvider`, `registerSelectionRangeProvider`,
`registerSemanticTokensProvider`, `registerInlayHintsProvider`,
`registerCallHierarchyProvider`, `registerTypeHierarchyProvider`,
`registerRenameProvider`, `registerDocumentSymbolProvider`,
`registerWorkspaceSymbolProvider`.

The list is intentionally CLOSED (see `LanguageProviderKind` in
`src/shared/extensionHost/protocol.ts`): adding a type is adding its serialization
**and** its consumer, not just declaring it.

## Decisions that matter

- **The document is resolved in the host.** If the file is not open in the editor
  (the "go to definition" into another file case), the host reads it through the
  main's jailed channel and materializes a real `TextDocument`
  (`workspace.textDocuments`). A provider that receives `undefined` cannot do its
  job.
- **Serialization in the host.** `Hover.contents` (string, `MarkdownString`,
  `MarkedString` or array), `Location` **and** `LocationLink` (tsserver/rust
  return the latter) and `TextEdit[]` are flattened to the LSP shape, which is
  what the editor already knows how to consume. The conversion lives where the
  real API classes exist.
- **A broken provider crashes nothing.** If it throws, it is logged with the type
  and the error, and the query continues (there may be another host that answers).
  The provider also does not see a cancellable `CancellationToken`: with no
  progress UI there is no real cancellation, and faking it would be worse.
- **Timeout in the main.** 5 s per query: a hung provider cannot freeze the
  editor's hover.
- **With no hosts, nothing is paid.** `hasExtensionProviders()` lets the path be
  cut when no extension is running.

## How to test it

It is tested against the compiled app:

```bash
# registration + serialization + query (host)
npx vitest run tests/language-providers.test.ts

# LSP request translation and fan-out (main)
npx vitest run tests/provider-bridge.test.ts

# the IDE querying a real provider, end to end
npx vitest run tests/extension-host.test.ts -t "proveedores de lenguaje"
```

## MIGRATION TO OWEAR (read before touching)

None of the three pieces knows Electron or stdio:

- `languageProviders.ts` (host) talks documents and providers.
- `providerBridge.ts` (main) is a table of one function + a timeout.
- The transport between them is still `RpcPeer` (`provider/query`), the same one
  the host's other methods use.

If Owear changes the runtime, the only thing to review is where the function is
registered in `src/main/ipc/extension-host.ts` (where the `ExtensionHostManager`
lives).
