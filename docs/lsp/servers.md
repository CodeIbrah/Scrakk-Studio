---
title: "Builtin servers, detection and auto-install"
group: lsp
order: 80
summary: "How Scrakk detects, chooses and (when needed) installs the language server for each language, with no configuration."
---
# Builtin servers, detection and auto-install

Scrakk ships a catalogue of servers (~26 languages) and picks them on its own; if
the binary is missing, it installs it.

## Detection

When a root loads, the builtins that satisfy ALL of these are discovered:

1. The binary exists in **PATH**, or in `<root>/node_modules/.bin/`.
2. If the server is `gatedBy` (linters): the project's `package.json` declares that
   dependency.
3. No server from a higher layer (user/project/dynamic) uses its name — builtins
   only fill gaps.

Builtin servers declare `rootMarkers`: to route a file, a marker must exist when
walking from the file upward to the root (`nearest_root`, the same algorithm as
the CLI/opencode). So `rust-analyzer` does not start for a loose `.rs` outside a
Cargo project.

## Catalogue (~26 languages)

typescript/js/jsx · eslint (gated) · biome (gated) · python/pyright ·
rust/rust-analyzer · go/gopls · c/cpp/clangd · java/jdtls · kotlin · ruby ·
bash · lua · css/scss · html · json · yaml · markdown/marksman · zig ·
elixir · dart · prisma · terraform · dockerfile · cmake · vue · svelte.

Each one defines `extensions` (ext → LSP languageId) and most define
`rootMarkers`.

## Auto-install

If a server is not installed but its definition has a **recipe** (`install`), the
manager installs it on demand with a 300 s timeout:

| Recipe | Runs | Resulting binary |
|---|---|---|
| `npm` | `npm i -g --prefix ~/.scrakk/lsp/npm <pkg>` | `~/.scrakk/lsp/npm/bin/<cmd>` |
| `go` | `GOBIN=~/.scrakk/lsp/bin go install <pkg>` | `~/.scrakk/lsp/bin/<cmd>` |
| `gem` / `dotnet` | the system manager | the system PATH |
| `github` | downloads the latest release asset and extracts it (zip via fflate, native tar) + chmod +x | `~/.scrakk/lsp/bin/<cmd>` |
| `custom` | arbitrary argv | depends on the script |

Safety conditions:

- **Extension gate**: before installing, the workspace is scanned (budget of 8000
  entries, skipping node_modules/.git/dist/…) looking for files with the server's
  extensions. If there are none, it does not install.
- **Global opt-out**: the env `SCRAKK_DISABLE_LSP_DOWNLOAD=1` disables all
  downloads.
- After installing, the config's `command` is rewritten to the managed path.

## Current recipes

Install recipes already included:

| Server | Recipe |
|---|---|
| typescript | npm `typescript-language-server typescript` |
| python | npm `pyright` |
| bash | npm `@bash-lsp/bash-language-server server` |
| json/css/html | npm `vscode-langservers-extracted` |
| yaml | npm `yaml-language-server` |
| go | go `golang.org/x/tools/gopls@latest` |
| markdown | GitHub release marksman (linux-x64) |

## Add your own server

Three paths, without touching code:

1. **`.scrakk/lsp.json`** (user or project) — see
   [configuration.md](configuration.md).
2. **SEF extension** with `contributes.lspServers` — see
   [extensions.md](extensions.md) (supports an install recipe and markers).
3. **PR to the catalogue** (`src/main/lsp/builtinServers.ts`) if it is useful for
   everyone: `{ id, command, extensions, rootMarkers?, gatedBy?, install? }`.
