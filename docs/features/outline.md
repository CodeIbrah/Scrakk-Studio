---
title: "Outline"
group: features
order: 260
summary: "The Outline panel: the symbol tree of the active file, from the parser's tags.scm or the regex extractor, and click-to-cursor navigation."
---
# Outline

The **Outline** is the symbol tree of the active file. It is not its own panel
in a slot: it is a **tool-dock item** (`features/tooldock/items/outline`) that
the Explorer mounts in its floating pill. Clicking a symbol moves the cursor in
that editor; it never opens another file.

## The tool-dock item

The built-in items are registered in `features/tooldock/items/index.ts`:

```ts
registerToolDockItem({
  id: 'outline',
  kind: 'panel',
  title: t('features.esquema'),
  icon: 'code',
  order: 10,
  hosts: ['explorer'],
  component: OutlinePanel
})
```

`hosts: ['explorer']` means it appears only in the Explorer's dock. The
component receives `{ hostId, currentFile }` (`ToolDockPanelProps`) and re-renders
when the active path changes. See [Tool dock](tool-dock.md) for the dock itself.

## Where the symbols come from

`OutlinePanel` resolves symbols in a fixed order:

1. **The parser tree (`tags.scm`)**. If the file's language has a dynamic
   tree-sitter extension installed, `treeSitterHighlightBridge.ts` runs
   `tags.scm` in the parser process and publishes the result through
   `@services/extensions/dynamicSyntax`:

   ```ts
   publishDynamicSyntax(path, {
     languageId, extensionId,
     symbols: toDocumentSymbols(data.symbols),
     folds, locals, textObjects, appliedCategories,
     at: Date.now()
   })
   ```

   This is the good source: symbols come from the real tree, nested by range
   containment, so a method appears inside its class without being declared.

2. **The regex extractor** (`@services/symbolExtractor`). When there is no
   dynamic parser, `extractSymbols(content, filename)` runs over the file text
   (live buffer via `getFileSessionText`, else `fs.readFile`). It is the safety
   net for the engine's built-in languages and files with no extension.

The panel reads the store synchronously with `getDynamicSyntax(path)` and,
because the tree arrives *after* the file opens, also subscribes with
`subscribeToDynamicSyntax(apply)`. Without that subscription the panel would stay
on the regex result.

```ts
import { getDynamicSyntax, subscribeToDynamicSyntax } from '@services/extensions/dynamicSyntax'
import { extractSymbols } from '@services/symbolExtractor'
```

## The symbol shape

Both sources produce `DocumentSymbol` (`@services/symbolExtractor`):

```ts
interface DocumentSymbol {
  name: string
  kind: SymbolKind          // class, method, function, constant, …
  line: number              // 0-based
  endLine?: number
  children?: DocumentSymbol[]
  detail?: string
}
```

`dynamicSyntax.ts` maps tree capture kinds (`@definition.class`, `@definition.method`,
…) to `SymbolKind` with `SYMBOL_KINDS`; anything unknown falls back to `variable`.
Icons and colors are `SymbolIcons`: `class` → `C` `#4EC9B0`, `function`/`method` →
`ƒ` `#DCDCAA`, `constant` → `K` `#4FC1FF`, and so on.

A `tags.scm` kind that the outline does not have maps to a close equivalent
(`type` → `class`, `macro` → `function`, `parameter` → `variable`).

## Navigating

On click the panel calls:

```ts
revealInnertaPosition(currentFile.path, symbol.line, 0)
```

This moves the cursor in the editor that already shows the file. The rationale is
in the component: the outline belongs to the open file, so opening another tab
"to go to the symbol" would be a lie. Top-level symbols with children start
expanded; each row toggles its subtree with a chevron.

A footer line states the source of what you are seeing: `features.arbol.de.sintaxis.tags.scm`
(the tree) or `features.extractor.local` (the regex extractor).

## Limits

- Only the Explorer hosts the tool dock, so the Outline is reachable from there
  today; another host needs to wrap its panel in `ToolDockHostProvider`.
- The panel reflects the **active file only**; it is not a workspace-wide symbol
  search.
- The regex extractor approximates: JSON symbols report `line: 1` (no line
  mapping), HTML only lists tags that carry `id`/`class`, and CSS lists selectors.
- The tree source needs an installed extension that ships a `.wasm` parser and
  `tags.scm`; without it the file falls back to the extractor.
- The LSP `textDocument/documentSymbol` is implemented
  (`services/lsp/api.ts`: `lspDocumentSymbol`, `lspDocumentSymbolNames`) but is
  **not wired into the Outline panel**. `definitionNavigation.ts` uses it only to
  cache declared names for the hover underline. The Outline shows tree + regex.

## Next steps

- [Tool dock](tool-dock.md) — the pill that hosts this panel and the other items.
- [File timeline](file-timeline.md) and [Bookmarks](bookmarks.md) — the sibling items.
- [Languages](../editor/languages.md) — how a parser and `tags.scm` get loaded.
- [The editor](../editor/editor.md) — cursor and definition navigation.
