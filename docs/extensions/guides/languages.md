---
title: "Languages"
group: extensions
order: 100
summary: "The language kit: identity and file association, grammars (tree-sitter or TextMate), snippets and defaults."
---
# Languages

A **language** is a **single** contribution with optional pieces: identity, file
association, `language-configuration`, grammars, snippets, defaults and semantic
token mapping. (In VS Code this would be five separate contribution points; here
it is one kit, so you do not declare the same thing three times.)

```json
{
  "languages": [
    {
      "id": "acme",
      "aliases": ["Acme"],
      "extensions": [".acme"],
      "filenames": ["Acmefile"],
      "filenamePatterns": ["*.acme.txt"],
      "firstLine": "^#!.*\\bacme\\b",
      "configuration": "language-configuration.json",
      "icon": { "dark": "icons/acme-dark.svg", "light": "icons/acme-light.svg" },
      "grammars": [
        {
          "kind": "treeSitter",
          "parser": "grammars/acme.wasm",
          "queries": [
            "grammars/queries/highlights.scm",
            "grammars/queries/locals.scm",
            "grammars/queries/tags.scm",
            "grammars/queries/folds.scm"
          ],
          "abi": "tree-sitter-abi-15",
          "sha256": "…"
        }
      ],
      "snippets": [{ "path": "snippets/acme.json" }],
      "configurationDefaults": { "editor.tabSize": 2, "editor.insertSpaces": true }
    }
  ]
}
```

## Identity and association

| Field | What it is |
|---|---|
| `id` | Language id (e.g. `acme`) |
| `aliases` | Human names (the first is the label) |
| `extensions` | File extensions (`".acme"`) |
| `filenames` | Exact names (`"Dockerfile"`) |
| `filenamePatterns` | Globs over the name (`"*.acme.txt"`) |
| `firstLine` | Regex on the first line (shebang) |
| `configuration` | Path to `language-configuration.json` |
| `icon` | `{ light?, dark? }` |

## Grammars

`grammars[]` is a **heterogeneous** list by `kind`:

- **`treeSitter`** — real tree-sitter highlighting: `parser` (`.wasm`),
  `queries[]` (the `.scm` files; **all** the ones you provide, not just
  `highlights`), `queriesDir?` (builtin only), `abi?`, `sha256?` (verified before
  loading), `native?` (native binary, opt-in + isolated process).
- **`textMate`** — the `.tmLanguage.json` of a VS Code extension: `scopeName`,
  `path`, `embeddedLanguages?`, `tokenTypes?`, `injectTo?`,
  `balancedBracketScopes?`, `unbalancedBracketScopes?`.

The tree-sitter parser runs in the **main, in a separate process**: a third-party
`.wasm` with a memory bug cannot take down the window.

## Snippets, defaults and semantic tokens

- `snippets: [{ path }]` — `snippets/<lang>.json` files.
- `configurationDefaults` — editor defaults for the language (`editor.tabSize`, …).
- `semanticTokenScopes: [{ language?, scopes }]` — the semantic-token-to-scope
  mapping.

## Notes

- The existence of the files is checked **at registration time** (by reading
  them), not with `hasModule` (a `.tmLanguage`/`.wasm` is an asset, not a bundle
  module).
- The builtin languages pack (`langs/`, `hidden`) ships bash, c, cpp, rust, etc.
  with their `queries` and `sha256` — it is the real reference for a `treeSitter`
  entry.

## Next steps

- [Editor → Languages](../../editor/languages.md) — how it is resolved and painted.
- [Contributes](../reference/contributes.md) — the full schema.
