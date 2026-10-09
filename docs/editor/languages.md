---
title: "Languages: how an extension adds syntax (VS Code → SEF → Innerta)"
group: editor
order: 30
summary: "How an extension adds syntax for a language: tree-sitter and TextMate as sources, a style resolver and a SEF kind that brings the whole kit without recompiling."
---
# Languages: how an extension adds syntax (VS Code → SEF → Innerta)

When you open a `.rs` or a `.py`, the editor colors it. This doc explains where
that color comes from and how an extension adds a new language.

Plan for the language system: **tree-sitter and TextMate as first-class sources**,
a single style resolver, a SEF kind that brings the whole kit and grammar loading
**without recompiling**. Design, not implementation.

Evidence: VS Code's source (`~/Documentos/Proyectos/vscode`) and Innerta's
(`~/Documentos/Proyectos/InnertaEngine/InnertaEngine-Linux`).

---

## 1. The REAL anatomy of a VS Code language extension

It is not "a kind": it is a **kit**. An extension like `rust-analyzer` or
`vscode-python` activates between 5 and 15 contribution points at once.

| Piece | Contribution point | What it adds |
| --- | --- | --- |
| Identity and association | `languages` | `id`, `extensions`, `filenames`, `filenamePatterns`, `firstLine`, `aliases`, `mimetypes`, `icon` (light/dark) |
| Editing behavior | `languages[].configuration` | `language-configuration.json`: brackets, `autoClosingPairs`, `surroundingPairs`, `comments`, `folding`, `wordPattern`, `onEnterRules`, `indentationRules` |
| **TextMate** color/tokenization | `grammars` | `scopeName`, `path`, `embeddedLanguages`, `tokenTypes`, `injectTo`, `balancedBracketScopes`, `unbalancedBracketScopes` |
| Snippets | `snippets` | `language` + `path` |
| Per-language editor defaults | `configurationDefaults` | `"[rust]": { "editor.tabSize": 4 }` |
| Semantic tokens | `semanticTokenTypes`, `semanticTokenModifiers`, `semanticTokenScopes` | its own types + **tokenType/modifier → scope mapping** |
| Language server | (its `main` starts it; in SEF: `lspServers`) | navigation, diagnostics, formatting |
| Build diagnostics | `problemMatchers`, `problemPatterns` | parsing compiler output |
| Tasks | `taskDefinitions` | how to build/run |
| Debug | `debuggers`, `breakpoints` | adapter + file types |
| UI and commands | `commands`, `menus`, `keybindings`, `walkthroughs` | what the user sees |
| JSON/YAML validation | `jsonValidation` | schema for the language's config files |
| REPL | `notebooks`, `notebookRenderer`, `notebookPreload` | interactive console |
| TS server plugins | `typescriptServerPlugins` | extensions of the TS service |
| Packaging | `extensionPack`, `extensionDependencies` | a language pack brings several |

**Consequences for the plan:**
1. The install report must be **per piece**, not "supported/no": the same extension
   can give color ✓, outline ✓, LSP ✓ and debug ✗.
2. **Activation per language** must be modeled (`onLanguage:<id>`): the parser and
   the queries load **lazily** when the first file of that language opens.
3. A language kit touches several SEF kinds (language + `lspServers` + `commands` +
   `menus` + `editorUI`). The loader already resolves kind by kind; the "kit" is a
   **presentation** (one card, not twenty).

---

## 2. How VS Code tokenizes (the real pipeline, with files)

1. **Registration**: `TMScopeRegistry` maps `scopeName` → grammar definition,
   storing `injectTo`, `embeddedLanguages` and `tokenTypes`
   (`services/textMate/common/TMScopeRegistry.ts`).
2. **Content**: the Extension Host sends the `.tmLanguage` (JSON or plist) to the
   renderer.
3. **Compilation**: `TMGrammarFactory` compiles it into a tokenizer; grammars with
   `injectTo` are **injected into another language's tokenizer** (a plugin can
   extend another's grammar).
4. **Tokenization in a WORKER**: `textMateTokenizationWorker` +
   `threadedBackgroundTokenizerFactory`, with dirty-region invalidation. Never on
   the UI thread.
5. **Style encoding**: each token is **a u32**
   (`editor/common/encodedTokenAttributes.ts`):

```
bbbb bbbb ffff ffff fFFF FBTT LLLL LLLL
   bg(8)   fg(9)  style(4) B(1) type(2) lang(8)
```

   And semantic tokens reuse the **same u32** with `SEMANTIC_USE_*` flags
   (italic/bold/underline/strikethrough/foreground/background) in the languageId
   byte → **a semantic token overrides ONLY what it declares** (if it does not
   declare a color, it keeps the TextMate one).
6. **Theme resolution**: `textMateScopeMatcher.ts` implements a **selector
   language**: `,` = alternatives · space = conjunction · `-` = negation ·
   parentheses · and **`R:` / `L:` priorities** (more specific wins).
7. The u32 array is the editor's token stream, which it paints from.

> **The lesson**: VS Code separates 4 things — (a) tokenizing, (b) resolving
> scope→style, (c) encoding the style, (d) painting. **Innerta mixes (a) and (b)
> inside the C++**: `MapCaptureColor()` decides color by `substring` and 15 fixed
> theme fields. That is the exact point to generalize.

---

## 3. The conceptual bridge: `@capture` ≡ `scope`

Measured on Innerta's real queries (`emscripten/queries/typescript/*.scm`):

```
@keyword  @type.builtin  @variable.parameter  @punctuation.bracket  @definition.function
```

And TextMate scopes:

```
keyword.control.flow.js   variable.parameter.function.js   punctuation.definition.string.begin.ts
```

**They are the same dot-separated namespace.** And `MapCaptureColor` **already
assigns priorities** (comment 100, string 90, keyword/operator 80, type 70, tag 70,
function 60, constant 50, parameter 40, property/attribute 30, builtin 20,
punctuation 15, variable 10).

From that comes the design:

> **A single resolver**: every source produces `(range, scope, priority)` and a
> single module resolves style with scope selectors (the theme's).

This removes the ceiling of 15 categories by substring **in one go** and makes a
theme's `tokenColors` work **the same** for tree-sitter, TextMate and semantic
tokens. Neither tree-sitter nor TextMate is a special case: they are sources.

---

## 4. The four sources and their priority

Where color can come from, and which one wins:

| # | Source | Where it runs | What it produces | Role |
| --- | --- | --- | --- | --- |
| 1 | **compiled tree-sitter** (20 languages inside the engine's `.wasm`) | inside the engine | spans with capture | base source for those 20, no data cost and no worker |
| 2 | **dynamic tree-sitter** (the `.sef`'s `.wasm`) | worker (`web-tree-sitter`) | spans + **tags/locals/injections** | the "add languages without recompiling" |
| 3 | **TextMate** (VSIX `.tmLanguage`) | worker (`vscode-textmate` + `vscode-oniguruma`) | spans with scope stack | VSIX compatibility and languages without a parser |
| 4 | **LSP semantic tokens** (already works, `docs/lsp/api.md`) | main | spans with tokenType/modifier | **overrides per range** what it declares |

Plus a separate layer for **decorations and diagnostics** (underlines,
backgrounds).

Tie-break rule: per range the highest-priority source wins; within a source, the
most specific scope selector wins (`R:`/`L:` like VS Code).

**tree-sitter is not the fallback**: it is source #1 (native) and #2 (dynamic). The
other two cover what tree-sitter cannot (VSIX grammars, and the LSP's refinement).

---

## 5. Findings that change the work

### 5.1 `tags.scm` and `locals.scm` are shipped and NEVER loaded

The repo brings `tags.scm` (definitions and references) and `locals.scm` (local
variables) per language, but the C++ only opens `highlights.scm` and
`injections.scm`.

**Big opportunity**: `tags.scm` gives **symbol outline and goto-definition without
an LSP** (what nvim does with this same ecosystem), and `locals.scm` gives local
resolution. They are files that are **already** in the repo.

### 5.2 Loading a new grammar today means recompiling

- **Desktop**: `TreeSitterLoader.cpp` does `dlopen(path)` and resolves
  `tree_sitter_<lang>` with `dlsym`. In other words: it **is already dynamic**…
  with two problems:
  - the `dlopen` runs **inside the process** (in Electron that is arbitrary native
    code execution);
  - the candidate list includes **an absolute path from a development machine**
    (`/home/julian/.../build-linux/libtreesitter.so`) → a deploy smell.
- **WASM**: the lookup goes against `kInnertaWasmSymbols`, a **compiled static
  table** (`TreeSitterLoader.cpp`), and the build does **not** use dynamic linking.
  More: the valid languages are a hardcoded `switch` (`EditorWindow.cpp:941`, with
  the comment *"Must match `tree_sitter_<name>` exports in libtreesitter.so +
  `queries/<name>/highlights.scm`"*).
- The queries are looked up in `exeDir + "/queries/"` / `"queries/"` + dev
  fallbacks → the layout is configurable (good), but **next to the binary**.

### 5.3 VS Code uses exactly the libraries we propose

VS Code's `package.json`: `"vscode-oniguruma": "1.7.0"` and
`"vscode-textmate": "^9.3.2"`. It is not a bet: it is the standard.

---

## 6. The new SEF kind: `languages` (language kit)

It goes in SEF:
`src/renderer/src/services/extensions/types/languages/{schema,api,logic,store}.ts`.

```jsonc
// manifest.json
{
  "contributes": {
    "languages": [
      {
        "id": "rust",
        "aliases": ["Rust"],
        "extensions": [".rs"],
        "filenames": [],
        "firstLine": "^#!/.*\\brust",
        "configuration": "language-configuration.json",
        "icon": { "light": "icons/rust-light.svg", "dark": "icons/rust-dark.svg" },

        "grammars": [
          {
            "kind": "treeSitter",                 // ← the central ask
            "parser": "grammars/rust.wasm",       // wasm: recommended
            "queries": "grammars/queries/rust/",  // highlights/localstags/injections
            "sha256": "…"
          },
          {
            "kind": "textMate",                   // ← VSIX compatibility
            "scopeName": "source.rust",
            "path": "syntaxes/rust.tmLanguage.json",
            "embeddedLanguages": { "meta.embedded.block.sql": "sql" },
            "tokenTypes": { "string.quoted": "string" },
            "injectTo": ["source.js"]
          }
        ],

        "snippets": [{ "path": "./snippets/rust.json" }],
        "configurationDefaults": { "editor.tabSize": 4 },
        "semanticTokenScopes": [{ "language": "rust", "scopes": { "keyword": ["keyword.control.rust"] } }]
      }
    ]
  }
}
```

Design points:

- **One kind, not three**: in SEF "a language extension" is one thing. The VSIX
  translator joins `contributes.languages` + `contributes.grammars` +
  `contributes.snippets` + `configurationDefaults` into **one entry**.
- **`grammars[].kind`** is what allows bringing tree-sitter **or** TextMate (and
  both: tree-sitter for the tree, TextMate for third-party color).
- Direct mapping VS Code → our model:

| VS Code (TextMate) | Our tree-sitter equivalent |
| --- | --- |
| `scopeName` + `path` (tmLanguage) | `parser` (wasm/native) + `highlights.scm` |
| `embeddedLanguages` (scope → languageId) | `injections.scm` (`@injection.content` / `@injection.language`) |
| `injectTo` (inject into another language's grammar) | `injections.scm` (injections toward other languages) |
| `tokenTypes` (scope → string/comment/regex) | capture name → standard type (`StandardTokenType`) |
| `semanticTokenScopes` | same (LSP side) |
| — | **`tags.scm` → symbols and goto-definition without an LSP** |
| `balancedBracketScopes` | (no equivalent) |

---

## 7. Loading grammars without recompiling: the three mechanisms

### (A) WASM in a worker — **recommended**

- `web-tree-sitter` (tree-sitter's **official** emscripten build, designed to load
  `.wasm` parsers at runtime) in a **worker**.
- The `.sef` brings `parser.wasm` (generated with `tree-sitter build --wasm`).
- The worker runs the queries (`highlights`, `tags`, `locals`, `injections`) and
  returns **data**: spans, symbols, folds, injections.
- That data enters the engine through the **paint list** (the same route as
  TextMate and semantic tokens).
- **Security**: the wasm runs in the runtime's sandbox (its own memory, no
  syscalls, no FS, no network). The `.sef` **does not execute native code**.
- **Cost**: CPU. It is paid for with the same as VS Code: tokenize the visible
  range first, per-line cache and dirty-region invalidation.
- **Honest limit**: the tree lives in the worker, so the engine cannot use it
  internally (fold/injections/tags travel as computed data).

### (B) Native `.so` / `.dll` — escape hatch, **isolated**

- **Never** `dlopen` in the main process: that is Electron main → any third-party
  `.sef` would be native code execution with access to fs/network/IPC.
- Load it in a **separate process** (`utilityProcess`) with:
  - **pre-flight**: read the binary's symbol table **without executing it** and
    require the allowlist (`tree_sitter_<lang>`,
    `tree_sitter_<lang>_external_scanner_*`, ABI);
  - hash/pin by the asset's `sha256`;
  - no access to the app's IPC except its `MessagePort`; killable and restartable;
  - **explicit consent** ("this extension brings native code") + a trust level,
    like VS Code's Workspace Trust.
- It is useful for: grammars without a wasm build, or where perf matters.

### (C) emscripten dynamic linking (`dlopen` of wasm *side modules*)

- Emscripten supports `dlopen` of wasm side modules (`-sMAIN_MODULE` /
  `-sSIDE_MODULE`): the engine would load `grammar.wasm` **in its own runtime** and
  have the tree inside (fold, tags, injections without a worker).
- Cost: **all** of Innerta's build moves to dynamic linking (size, startup,
  complexity) and the `.wasm` must be a side module (not the ecosystem's standard
  format).
- Verdict: **not to start with**. Only if (A) is not enough.

> With (A), the "add languages without recompiling" ask is met **without touching
> Innerta's build**. (C) is the version where "the engine also wants the tree".

---

## 8. Multi-kind: how it composes and is reported

- **Report per piece** (color, outline, navigation, LSP, snippets, debug…), with
  its reason when missing. A language extension is never "supported" or "not" as a
  block.
- **Composition**: `languages` + `lspServers` (already exists) + `editorUI` +
  `commands`/`menus` + `configuration` are different kinds the loader already
  dispatches separately. The kit is the **card** that groups them.
- **Activation**: `onLanguage:<id>` when the first file opens → load the parser,
  the queries and (if it exists) start the server. Without this, installing 20
  languages would cost 20 workers when the app opens.
- **Conflicts**: two extensions with the same `scopeName`/`id` (VS Code warns and
  the last one wins). It needs an explicit rule + a user override.

---

## 9. Phases

The plan by phases:

| Phase | What | Unlocks |
| --- | --- | --- |
| **L0** | Clear the ground: remove the absolute path from the loader, unify `EditorWindow.cpp`'s hardcoded language list, declare the `queries/` layout | nothing visible; stops stacking on debt |
| **L1** | **Scope resolver + paint list** (the u32-style + palette): a single resolution for the 4 sources | **foundation**: without this no source colors well and the 15 ceiling stays |
| **L2** | **SEF kind `languages`** + registration + `onLanguage` + associations + `language-configuration` | declare a language (no color yet) |
| **L3** | **dynamic tree-sitter wasm in a worker** (parser + `highlights` + `tags` + `injections` + `locals`) | **add languages without recompiling**, and outline/goto-definition without an LSP |
| **L4** | **TextMate** (`vscode-textmate` + oniguruma) for VSIX | `contributes.grammars` supported; any language colors |
| **L5** | **Semantic tokens merge** on the resolver (overrides per range what it declares) | exact color with an LSP, without losing the tree's |
| **L6** | Snippets, folding from the tree, nested injections, `locals` | language fidelity |
| **L7** | Isolated native (`utilityProcess`) + trust/permissions + hash | grammars without wasm, with explicit security |

**L1 is first for a hard reason**: it is the only point L3, L4 and L5 depend on. If
it is done last, the three must be rewritten.

---

## 10. Open decisions

1. **Kind name**: `languages` (kit) vs `grammars` vs `treeSitter`. With the three
   things together (association + configuration + grammars), `languages` describes
   it better.
2. **One tokenization worker or one per editor?** Today each tab is a WASM module;
   a worker per tab multiplies RAM. Candidate: **a shared worker** with a queue.
3. **Who owns a language's parser?** Proposed criterion: if the engine already has
   it compiled → engine (source #1); if not → worker (source #2). And if an
   extension brings a **better** version of an already-compiled language?
4. **Are `.so`/`.dll` supported or only wasm?** Recommendation: **wasm by
   default**, native opt-in with permission.
5. **Does `tags.scm` enable goto-definition and outline on its own when there is no
   LSP?** Recommendation: **yes** — it is free (files already present) and it is
   what nvim does.
6. **What happens with the 20 hardcoded languages** once dynamic loading exists? Do
   they stay as a fast path (recommended) or do they all migrate to the worker?

---

## 11. Risks

What can hurt:

| Risk | Why it hurts | Mitigation |
| --- | --- | --- |
| 3 tokenizers (native engine, tree-sitter worker, TextMate worker) | CPU/RAM cost and three color truths | a single output (spans) + a single resolver + visible-first tokenization |
| Worker latency on large files | the color "arrives late" | dirty region + per-line cache + priority to the visible |
| The engine cannot consume the worker's tree | fold/injections/tags are not free | they are computed in the worker and travel as data |
| `dlopen` = RCE | any third-party `.sef` | separate process + symbol allowlist + hash + consent |
| Deploy: absolute path in the loader, `queries/` next to the binary | it works on the dev machine and not on the user's | L0 |
| Two extensions with the same `scopeName`/`id` | "random" color depending on install order | explicit rule + user override |
| Duplicating the coverage truth | `surface/` already exists for this | each phase updates one entry, not a new list |

---

## 12. Implementation status (what ALREADY works)

This section is the one to read to know what is really done. Everything marked ✅
is **verified on the compiled app** with the REAL Gleam extension
(`gleam.gleam 2.13.0`, the `.vsix` is left in `~/Descargas`).

| Phase | Status | Where it lives |
| --- | --- | --- |
| **L0** ground | ✅ | absolute paths out of the loader (`INNERTA_TREESITTER_LIB`, `INNERTA_QUERIES_DIR`); language by ID in `SetInnertaLanguage`; the engine's fallback is no longer `javascript` |
| **L1** resolver + paint list | ✅ | `src/shared/syntax/scopes.ts` · `spans.ts` · `legend.ts` (`R:`/`L:` selectors, `-`, parentheses, commas; VS Code's u32; palette) |
| **L2** SEF kind `languages` | ✅ | `services/extensions/types/languages/{schema,logic,store,api}.ts` + VSIX translator |
| **L3** dynamic tree-sitter | ✅ | `main/extensions/treeSitter/{manager,tokenizer,scopes,queryData,abi}.ts` + worker `entry.ts` (separate process) + `treeSitterHighlightBridge.ts` |
| **L4** TextMate | ✅ | `main/extensions/tokenize.ts` (main, not a worker: see below) + `types/languages/highlight.ts` |
| **L5** LSP ↔ grammar merge | ✅ | `hostTokens.ts` (single owner of the channel) + `mergeHostTokens` |
| **L6** snippets / folding / locals | ✅ | snippets and `language-configuration` at registration; **tree folding** (`SetInnertaFoldingRanges`) and **locals** (`resolveDefinition`) truly consumed (see 12.5) |
| **L7** isolated native | 🟡 | per-hash consent implemented (`store.ts`) and verified in the manager; the native path (`.so`/`.dll`) is not loaded yet |
| **Extra** embedded languages | ✅ | a second pass in `tokenize.ts` (injections + `embeddedLanguages`) and, on the dynamic side, `injections.scm` re-tokenized with the injected language's parser |
| **Extra** theme tokenColors | ✅ | `themeTokenRules.ts`: `tokenColors` enter as resolver rules |
| **Extra** inspection panel | ✅ | `editor.inspectTokens` command + `features/editor/inspect/` |
| **Extra** outline from the tree | ✅ | `tags.scm` → `dynamicSyntax.ts` → **Outline** panel (with a click that moves the cursor) |
| **Extra** go to definition without an LSP | ✅ | `locals.scm` → `resolveDefinition` → `editor.goToDefinition` command (F12), with the LSP as fallback |
| **Extra** expand selection | ✅ | `textobjects.scm` → `editor.expandSelection` (Shift+Alt+→) via `SetInnertaSelection` |
| **Extra** selectable grammar engine | ✅ | `editor.grammarEngine` (`auto` / `treeSitter` / `textMate`) in Settings → Highlighting; the decision lives in `grammarSelection.ts` |

### The channel that made all of this possible

The engine had `SetInnertaSemanticTokens` **declared and unused**: it stored the
array and nothing read it. Now it is the host's single color channel:

```
LSP (server legend) ──────────┐
TextMate grammar ─────────────┼─→ mergeHostTokens ─→ encodeHostTokens ─→ SetInnertaSemanticTokens
Dynamic tree-sitter (.wasm) ──┘        (priority)        (LSP delta)          (the C++ paints)
```

And there is a detail only visible when looking at the emscripten glue: **passing a
JS array to an export that expects a pointer does not work** (it is coerced to a
number → `NULL`). The old path did exactly that, so the LSP tokens never reached
the engine and there was no visible error. The correct form (`malloc` + `HEAP32` +
`free`) is in `innertaLoader.ts` and is what the bookmarks use.

### Tokenizing in the main (and not in a worker)

The plan asked for a worker. The implementation uses the **main process** because:

1. the `.tmLanguage` files are on disk and the main can already read them (with a
   check that the path is INSIDE `userData/extensions`: a path coming from a
   manifest is third-party data);
2. Oniguruma's `.wasm` is resolved with `require.resolve` — in the renderer you
   would have to version a binary in `public/` or fight `fetch` over `file://`;
3. it does **not** block the UI, just like a worker: it is another process.

The renderer sends paths + text and receives **scopes** (interned, so a large file
does not travel as tens of thousands of objects). The color is resolved in the
renderer because the theme lives there.

### Embedded languages (done)

A Gleam block inside markdown needs TWO things and both are there:

1. **Injection** (`injectTo`): the foreign grammar is applied INSIDE the parent and
   marks the span (`meta.embedded.block.gleam`). Without this there is nothing to
   re-tokenize; it is the classic mistake of implementing only half.
2. **Second pass** (`embeddedLanguages`): that scope maps to a language id and its
   grammar tokenizes the span with its own stack, which is preserved across lines
   (otherwise a multi-line block breaks on the second line).

The renderer sends the three grammar families (root, embedded and injected) so the
main can do both passes.

### The theme's color rules (also in grammars)

`applyInnertaTheme` already mapped `tokenColors` to the engine's 15 fields. What was
missing is that same mapping entering the scope resolver as RULES: without that, a
theme that distinguishes `comment.line` from `comment.block` painted them the same,
because the default table sends all `comment*` to the same slot. Now
`themeTokenRules.ts` pushes each theme selector with its score, so for an equal
selector the theme wins, and for higher specificity the theme's wins. What does NOT
travel yet are `fontStyle`s (the engine's `LineStyle` is color only).

### "Inspect tokens" panel (`editor.inspectTokens`)

The slot does not say who got it wrong. The panel shows, per file and per SOURCE
(in priority order, with the one that overrides marked), each token's scope stack,
the slot it resolved to and the color the theme gave it — with a summary grouped by
scope and the raw token list. Provenance is kept by `highlightSnapshot.ts` (one
entry per source: the LSP and the grammar coexist in the same file and with a
single entry they erased each other's trace). It opens from the palette or from
Settings → Highlighting.

### Dynamic tree-sitter: a third-party `.wasm`, in its own process

A SEF package can bring its parser (`grammars/x.wasm`) and its `.scm` queries. That
is more precise than a `.tmLanguage`: the syntax tree knows that `*` is a
multiplication and not a pointer. The price is running a third-party binary, so it
goes in a **separate `utilityProcess`** (`tree-sitter/manager.ts`):

- **per-request timeout** (10 s) and if it hangs the process is KILLED — a hung
  wasm inside the main takes the window with it;
- **idle shutdown** (1 min): most sessions do not open a dynamic language and do
  not load with a live process;
- **path jail** (parser and queries inside `userData/extensions`) and **sha256
  required when the package declares it** — the hash is what turns "I trust the
  package I installed" into something verifiable;
- **ABI**: the declared one is compared with the real one and it WARNS (does not
  fail: a parser from another ABI often parses and produces nodes the queries no
  longer know).

Both sources have the same priority in the merge, so publishing through both would
mean not being able to decide who rules. Who wins is **chosen by the user** in
Settings → Highlighting (`editor.grammarEngine`), because there is no correct
answer for everyone: `auto` (default) prioritizes TextMate —the path VS Code
extensions use—, `treeSitter` prioritizes the tree whenever there is a usable one
(a `.tmLanguage` cannot know that `*` is a multiplication) and `textMate` does not
start the parser process. The decision lives in ONE place (`grammarSelection.ts`)
and both bridges consult it: the one that does not win publishes nothing. If the
chosen language does not have that grammar, it falls back to the other (the file is
never left uncolored for no reason) and the reason goes into the diagnostic log.

#### The finding that almost broke everything (measured, not assumed)

tree-sitter's documentation talks about BYTE offsets, so the natural thing is to
encode to UTF-8 and translate each index to a UTF-16 column. **That desyncs the
color** from the first multibyte character on: the `web-tree-sitter` binding passes
the text with `(i) => text.slice(i)`, i.e. its index space is UTF-16 units even
though the docs say "bytes". Measured with the real JavaScript parser:

```
`const a = "😀"`  → the string capture is [10, 14]   (4 UTF-16 units)
`const a = "ab"`  → [10, 14]
(in bytes, the first would be [10, 16] → everything after it, shifted)
```

That is why `scopes.ts` does NOT convert: it uses the parser's index as-is, which
is already in the editor line's unit (and clamps it if a parser returns a range
longer than the text).

### 12.5 Tree data (not just color)

The tokenizer returned **only** color: it loaded `tags.scm`, `folds.scm`,
`locals.scm`… and ignored them with an `if (category !== 'highlights') continue`.
In other words: the cost of reading and compiling those queries was paid to throw
their data away —the tree knows where each function is, what folds and which
definition each variable points to, and none of that reached the UI. Now the
request travels with ALL categories and the response brings, in a single pass:

| Query | Data | Who consumes it |
| --- | --- | --- |
| `highlights.scm` | tokens (scope + slot) | `hostTokens` → `SetInnertaSemanticTokens` |
| `tags.scm` | nested symbols | **Outline** panel (`services/extensions/dynamicSyntax.ts`) |
| `folds.scm` | foldable ranges | engine: `SetInnertaFoldingRanges` (gutter chevrons), with state read back with `GetInnertaFoldingCount` / `GetInnertaFoldingIsHost` / `GetInnertaFoldingFromEngine` |
| `injections.scm` | spans of another language | re-tokenized in the SAME request with the injected language's parser |
| `locals.scm` | definitions and references with their scope | **Go to definition** (`treeNavigationLogic.resolveDefinition`) |
| `textobjects.scm` | function/class/parameter ranges | **Expand selection** (`SetInnertaSelection`) |
| `indents.scm`, `unknown` | — | they load and are reported; there is no consumer yet (see Limits) |

**Each query's convention is the contract** and that is why it is in a module of its
own (`treeSitter/queryData.ts`), pure and tested: symbols come from `@definition.X`
with a `@name` inside (or from the capture's own text if the grammar captures the
identifier), folding from `@fold[.kind]`, injections from
`#set! injection.language` (or from the text of an `@injection.language`, which is
the heredoc case) and scopes from `@local.definition` / `@local.reference` /
`@local.scope`.

Two details that each cost a bug:

1. **A range's end is EXCLUSIVE.** If computed with `positionAt(end)`, a node that
   ends right at a line break reports the next line: a 4-line function looked
   5 lines and its fold ate the blank line below. It is computed from the LAST
   captured CHARACTER.
2. **A single-line range is not folded** and is dropped; and if two queries capture
   the SAME start line, the larger range wins (folding the line above hides the
   block, not its header).

Folding is hostile to getting it wrong little by little: `FoldingManager::UpdateRanges`
runs on every buffer change and **overwrites** the ranges, so it now has a host mode
(`SetHostRanges`/`ClearHostRanges`): while the host has tree ranges, the
indentation heuristic does not touch them (one keystroke would unfold the whole
file). Sending an EMPTY list is the order to go back to indentation, and it is what
the bridge does when opening another file.

### 12.6 The CLI resolves the queries the repo does NOT publish

Measured over the engine's 18 languages: `folds.scm` **0/18**, `indents` 0/18,
`textobjects` 0/18, `locals` 4/18, `injections` 7/18. It was not a CLI oversight: it
is what each parser repo publishes. And it did not fail with an error, it failed
with SILENCE: the package installed without `folds.scm` and the editor folded by
indentation without anyone knowing why.

`tools/grammar.mjs` now resolves **per category** and reports the result:

1. **own override** — `deps/queries-overrides/<symbol>/<category>.scm`, which is
   what the engine already knows how to apply (`applyQueryOverrides` overwrites or
   adds);
2. **parser repo** (upstream);
3. **supplement** — nvim-treesitter **pinned by commit** (Apache-2.0), which is
   where the real supplementary catalogue lives. It is stored in the settings
   directory: the next run needs no network and the SAME file serves both the SEF
   package and the embedded engine (a single source of truth).

What each category wins goes into the package's `grammar.json` with its provenance
(`source`, `origin`, `ref`, `license`, `sha256`) and the ones that could not be
brought are declared in `missingCategories` — the IDE falls back to its
alternative and there is a record that it was on purpose. `--verify` runs the
queries and **a category with 0 captures is an install error**, not a notice.
Flags: `--categories`, `--supplement none|nvim`, `--supplement-ref`,
`--overrides`, `--verify`.

`--target engine` mode: copies the sources (blacklist of what the C build does not
use — and not "only `src/`", because several monorepos include siblings of the
parser), annotates the supplements in `deps/queries-overrides/<symbol>/` and, with
`--build`, regenerates the wasm fragments (`tools/tui /build-wasm`) and recompiles
with `emscripten/build-wasm.sh`, which already leaves `innerta.wasm`/`innerta.js`
in `src/renderer/public/innerta/`.

### 12.7 The engine also reads `folds.scm` (built-in languages)

Until here, tree folding only arrived through the host (`SetInnertaFoldingRanges`,
which is the dynamic grammar and `.sef` path). An EMBEDDED language has no host to
push anything to it, so it folded by indentation even though the tree knew where
each block starts and ends.

`SyntaxHighlighter::CollectFoldRanges()` runs `folds.scm` on the tree left by the
highlighting (same frame, without parsing twice) and `EditorWindow` applies it:

- **who rules**: the host, in ITS language (a dynamic grammar wins over the
  embedded one). The engine neither wins nor stays mute because of an old push:
  ownership is annotated per language and the host releases it by sending an empty
  list;
- **and the host's `[]` returns folding to the ENGINE, not to indentation**: the
  IDE sends the empty list when opening a file (`startHighlightPipelines`), and
  that clear arrived AFTER the first paint — it erased the embedded `folds.scm`
  ranges and there was nothing to recompute them until a keystroke, so a built-in
  language folded by indentation forever. Now that `[]` asks for a new highlight,
  and the next Paint runs the tree query again;
- **the data**: only lines (`startLine` + 1 .. `endLine`, the same contract as the
  host) and the `kind` from the capture's suffix (`@fold.comment` → 1,
  `@fold.imports` → 2, rest 0), the same criterion as `foldKindCode` on the TS
  side. nvim's `(#set! fold.kind …)` directives are ignored on purpose: the engine
  does not interpret `#set!`;
- **no query means nothing is invented**: unlike `injections.scm`, there is no
  default pattern (a guessed fold query would fold wrongly); without `folds.scm` it
  keeps folding by indentation, and the `nullptr` is cached so it does not re-read
  disk every frame;
- **honest diagnostic**: `GetInnertaFoldingIsHost` answered "it is not
  indentation", which now has two causes (a dynamic grammar from the host or the
  embedded `folds.scm`). `GetInnertaFoldingFromEngine` tells them apart, so the
  `[languages] …` line no longer reports a built-in language's folding as "from the
  host".

### Known limits (stated, not hidden)
- **`file.saveAll`** always returned an error (`{ ok }` vs `{ success }`) — fixed
  along the way, because a language formatter uses it.
- **`tag`** is an EXTRA legend entry (index 23): the LSP has no `tag`, and without
  it an HTML label fell into the type color. The mirror between `legend.ts` (TS)
  and `SyntaxHighlighter::LspTokenTypeToSlot` (C++) is a contract: the test
  `tests/syntax-legend.test.ts` verifies it on the TS side.
- **Themes**: `fontStyle`s (italic/bold per scope) do not travel to the engine: its
  `LineStyle` is color only. The data is not lost on the host path (the paint list
  already models it) but the canvas does not paint it.
- **Dynamic tree-sitter**: `indents.scm` (and `unknown` queries) load and are
  reported, but their data still has no consumer: indentation on Enter is decided
  by the engine, and changing it needs a new channel (`SetInnertaIndentRules`) that
  does not exist.
- **Dynamic injections**: the span is re-tokenized only if the injected language is
  installed and has a `.wasm` parser. The languages declared in an `injections.scm`
  are read when indexing the query (`injectionLanguagesOf`), so candidates are not
  sent blindly.
- **Selection**: `expandSelection` remembers the last range per file (the engine
  only returns the selected TEXT, not the range), so a manual click in the middle
  restarts the cycle at the smallest object.
- **Native parser** (`.so`/`.dll`): the schema declares it, the manager requires it
  explicitly and the worker rejects it with the correct reason. Loading it needs
  the isolated process with consent that is not there yet.

### How it is tested

```bash
# Units (fast, no network)
npx vitest run tests/syntax-legend.test.ts tests/language-tokenizer.test.ts \
               tests/language-highlight-map.test.ts tests/languages-translator.test.ts \
               tests/tree-sitter-scopes.test.ts tests/tree-sitter-manager.test.ts \
               tests/tree-sitter-query-data.test.ts tests/tree-navigation-logic.test.ts \
               tests/dynamic-syntax.test.ts \
               tests/highlight-snapshot.test.ts tests/theme-token-rules.test.ts

# REAL wasm parser (the binary is not committed: the package published by VS Code is downloaded)
npm pack @vscode/tree-sitter-wasm@0.3.1 && tar xzf vscode-tree-sitter-wasm-0.3.1.tgz
SCRAKK_TS_PARSER=$PWD/package/wasm/tree-sitter-javascript.wasm npx vitest run tests/tree-sitter-tokenizer.test.ts

# COMPILED worker in Node (production bundle + wasm runtime + real parser)
npm run build && node tools/_probe-tree-sitter.mjs $PWD/package/wasm/tree-sitter-javascript.wasm

# REAL app: installs the .sef, tokenizes over IPC (utilityProcess) and verifies PAINTING
node tools/_make-dynamic-sef.mjs $PWD/package/wasm/tree-sitter-javascript.wasm
xvfb-run -a node tools/_probe-dynamic-app.mjs
# Same file with and without the extension: the pixels that go from gray to color
# are the tokens the extension painted (see docs/editor/screenshots.md)
node tools/_look-png.mjs /tmp/innerta-shots/editor-without-extension.png \
                         /tmp/innerta-shots/editor-with-extension.png

tools/_make-openfile-vsix.mjs && node tools/_probe-language.mjs   # compiled app
```

The dynamic probe runs on real Electron and verifies, in this order: that the
`.sef` installs; that `tokenizeDynamic` answers with tokens and scopes (i.e. that
the `utilityProcess` comes up, receives the request and answers); that a request
with the SIX categories returns nested symbols, folding, scopes (with their scope),
text objects and a CSS injection; that a sha256 that does not match is rejected
BEFORE running the wasm; that opening the file paints the pixels from gray to
color and that the **Outline** panel shows the TREE's symbol; and that the grammar
engine setting turns the tree off and back on without reopening the file.

And since the last pass the probe **drives the app** instead of watching the store,
because the fact that the data arrived does not prove the user can use it:

- **F12 on a reference** → the status bar stays at `Ln 8, Col 10`: the DEFINITION
  of `saludar`, resolved with `locals.scm` (and at the identifier's column, not the
  `function` one).
- **Shift+Alt+→** → the before/after is captured and the canvas pixels are compared;
  and so there is no doubt about WHAT was selected, **Ctrl+C and the clipboard is
  read**: `"function saludar(nombre) {\n  return nombre\n}"`, which is exactly the
  `function.outer` object the tree declared. A second press has no larger object and
  the command SAYS so.
- **Click on the gutter chevron** → the block folds: the capture shows it (the body
  lines disappear). To click where it has to click, the probe **calibrates the
  editor's geometry against the status bar** (click sweep and adjustment of line
  height, text origin and char width, with residual verification): no assuming the
  layout, and two points are not enough — `floor` rounding made it think the line
  measured 17.2px when it measured 16.

Folding is the only thing that cannot be read from the DOM, and its evidence is the
bridge's diagnostic line:

```
[languages] dynjs: 13 tokens · 4 symbols · folds: 2 in the engine, from the host (applied) · 6 locals · …
```

`2 in the engine, from the host` comes from the ENGINE'S OWN COUNTER
(`GetInnertaFoldingCount` / `GetInnertaFoldingIsHost`, now exposed in the loader):
it says how many ranges it holds and that they are the host's, not the indentation
heuristic's. It is on purpose that "the call did not throw" is not enough:
`setFoldingRanges` is `void`, and taking a non-throwing `void` as good is exactly
the false green that makes you look for the bug in the wrong place.

As a control it uninstalls the extension and captures again: if the counts do not
drop, the metric is lying (it is exactly what happened with the first version of
the check, which measured the wallpaper's color).

The last probe installs the real Gleam VSIX, verifies the translated manifest,
tokenizes the REAL GRAMMAR, checks the engine channel round-trip in the compiled
WASM, opens the file through an extension and measures the editor's pixels to
confirm there is **token color** (not just gray text).
