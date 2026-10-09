---
title: "LSP system tests"
group: lsp
order: 90
summary: "How to run the LSP suite: what each test covers and how to use the mock server."
---
# LSP system tests

Everything runs with **Vitest**: one file per area, plus a mock server so it does
not depend on external binaries.

```bash
npm test          # the whole suite
npx vitest run tests/lsp/manager.test.ts   # one file
```

## Suites

What each file covers:

| File | Covers |
|---|---|
| `config.test.ts` | lsp.json parsing (aliases, extension normalization), user→project merge, dropping invalid entries, timeout defaults |
| `routing.test.ts` | nearest_root (markers above/below/outside), resolve_servers multi-server with alphabetical order and marker gating |
| `scrakkFolder.test.ts` | `.scrakk` layers: paths, tolerant read, write, project>user merge |
| `client.test.ts` | stdio E2E: handshake → ready, didOpen → publishDiagnostics, versions, definition request, ordered shutdown (the child dies) |
| `client-socket.test.ts` | TCP transport E2E: a mock LSP over a real net.Server |
| `incremental.test.ts` | computeIncrementalChange (pure) + E2E: an incremental server receives range edits; full-sync keeps receiving full text |
| `protocol.test.ts` | completionItem/resolve targeted by serverName; $/progress begin/report/end with a unique token; semanticTokens passthrough |
| `manager.test.ts` | integration: project config + builtins without overriding, lazy start, drain merging TWO servers, deadline, routed/broadcast/targeted requests, readDiagnostics on demand, status with source |
| `multiroot.test.ts` | two roots with different servers (routes only to the owner), deeper nested root, dynamic servers: register/remove and merge by id |
| `manager-restart.test.ts` | real SIGKILL of the child → crashed → retrying → NEW pid → verified replay; and without restartOnCrash it stays down |
| `install.test.ts` | argv for npm/go/gem/dotnet/custom recipes, env opt-out, managed dirs, extension scan with node_modules skipped |
| `format.test.ts` | the exact `<lsp-diagnostics>` block (1-based labels, tag escaping) |

## Mock language server

`tests/helpers/mock-lsp-server.mjs` — a Node process that speaks real JSON-RPC/LSP
over stdio (Content-Length framing). Configurable through env:

| Env | Effect |
|---|---|
| `MOCK_INCREMENTAL=1` | negotiates `textDocumentSync { change: 2 }` |
| `MOCK_SEMANTIC=1` | semanticTokensProvider capability + response data |
| `MOCK_DIAG_MESSAGE` / `MOCK_DIAG_LINE` | diagnostic published on open/change/save |
| `MOCK_TARGET` | the location target in textDocument/definition |

Custom requests for assertions: `mock/state` → `{ changes, version, incremental }`
(the last thing sent in didChange).

Supported methods: initialize, initialized, shutdown/exit, didOpen/didChange/didSave
(publishes diagnostics), definition (with a full $/progress cycle around it),
hover, completion + completionItem/resolve, semanticTokens/full.

## Conventions

- Each test uses its own tmpdirs (`makeTempDir`) + an overridden `SCRAKK_HOME` —
  it never touches the real home.
- `waitFor(fn)` polls with a deadline (publishes are async).
- Manager tests write configs through the layering system itself
  (`writeJsonLayer(projectConfigPath(...))`) — full dogfooding.
