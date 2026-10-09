---
title: "Extension API (vscode)"
group: extensions
order: 230
summary: "The surface of the vscode module an extension's code sees, with its real status: what works, what is partial and what is missing."
---
# Extension API (`vscode`)

An extension **with code** (`runtime` in the manifest) runs in the Extension
Host, where Scrakk injects its own `vscode` module. It is not Microsoft's
package: it is a reimplementation covering what real extensions use.

Everything available is declared in **a single table**
(`shared/compatibility/surface/namespaces/…`) with an honest status. An **audit**
walks the API at runtime and fails if a member appears without being declared:
the table cannot lie by omission.

Statuses:

- **real** — works.
- **partial** — works, with a declared degradation.
- **inert** — it registers (so `activate` does not break) but does nothing yet.
- **missing** — it is not there; it fails with a clear error.

## `commands`

| Member | Status |
|---|---|
| `executeCommand` | real (IDE built-ins are resolved without going through the UI) |
| `registerCommand` | real |
| `registerTextEditorCommand` | real |
| `getCommands` | real |

## `window`

| Member | Status |
|---|---|
| `showInformationMessage` / `showWarningMessage` / `showErrorMessage` | real |
| `showTextDocument` | real |
| `createStatusBarItem` / `setStatusBarMessage` | real |
| `registerWebviewViewProvider` | real |
| `createWebviewPanel` | real |
| `registerTreeDataProvider` / `createTreeView` | real |
| `registerUriHandler` | real |
| `activeTextEditor` / `visibleTextEditors` | real |
| `onDidChangeActiveTextEditor` / `onDidChangeVisibleTextEditors` | real |
| `onDidChangeTextEditorSelection` / `onDidChangeTextEditorVisibleRanges` | real |
| `onDidChangeWindowState` | real |
| `createTextEditorDecorationType` | real (the **underline** is painted; text color/border/ruler are ignored) |
| `withProgress` | partial (the task runs; there is no visible progress bar) |
| `createDiagnosticCollection` | partial (they show in Problems; the underline on the canvas is not there yet) |
| `createOutputChannel` | partial (writes to the host log; there is no Output panel) |
| `tabGroups` | partial (exposes the active tab) |
| `createFileSystemWatcher` | inert |
| `onDidChangeActiveColorTheme` | inert |
| `showQuickPick` / `showInputBox` | missing (there is no picker/input for extensions yet) |

## `workspace`

| Member | Status |
|---|---|
| `fs` (readFile/writeFile/stat/readDirectory/createDirectory/delete/rename/copy) | real (with the main's **path jail**) |
| `findFiles` | real |
| `getConfiguration` | real |
| `textDocuments` | real |
| `openTextDocument` | real |
| `onDidOpen/Change/Close/SaveTextDocument` | real |
| `registerTextDocumentContentProvider` | real |
| `asRelativePath` / `getWorkspaceFolder` / `workspaceFolders` / `rootPath` | real |
| `createFileSystemWatcher` | inert (never emits) |
| `onDidChangeConfiguration` / `onDidChangeWorkspaceFolders` | inert |
| `onWillSaveTextDocument` | inert |
| `onDidCreate/Delete/RenameFiles`, `onWillCreate/Delete/RenameFiles` | inert |
| `applyEdit` | missing (needs the host → editor channel) |

## `languages`

| Member | Status |
|---|---|
| `getDiagnostics` / `onDidChangeDiagnostics` | real |
| `getLanguages` / `match` / `setLanguageConfiguration` | real |
| `registerHoverProvider` | real (the IDE queries it and **paints** it) |
| `registerDefinitionProvider` | real (paints) |
| `registerDocumentFormattingEditProvider` | real (paints) |
| `registerDeclarationProvider`, `registerTypeDefinitionProvider`, `registerImplementationProvider`, `registerReferenceProvider`, `registerDocumentHighlightProvider`, `registerDocumentRangeFormattingEditProvider` | partial (the extension answers; the editor does not show that result yet) |
| `registerCompletionItemProvider`, `registerDocumentSymbolProvider`, `registerWorkspaceSymbolProvider`, `registerDocumentLinkProvider`, `registerCodeLensProvider`, `registerCodeActionsProvider`, `registerRenameProvider`, `registerSignatureHelpProvider`, `registerFoldingRangeProvider`, `registerSemanticTokensProvider`, `registerInlayHintsProvider`, `registerSelectionRangeProvider`, `registerCallHierarchyProvider`, `registerTypeHierarchyProvider` | inert (they register; the IDE does not query them yet) |

## `env`

`appHost`, `appName`, `appRoot`, `language`, `machineId`, `openExternal`,
`remoteName`, `sessionId`, `uiKind`, `uriScheme`, `version` → **real**.
`isTelemetryEnabled` and `onDidChangeTelemetryEnabled` → real (the real setting
travels in `init` and changes live). `shell` → real (`undefined` if it cannot be
known). `asExternalUri` → partial (returns the same URI). `isNewAppInstall` →
partial (always `false` today).

## `l10n`, `extensions`, editing

- `l10n.t` → **partial**: it substitutes placeholders, but Scrakk does not read
  the extension's `l10n/*` bundles yet (texts come out in the base language).
- `extensions.getExtension` / `all` / `onDidChange` → **inert** (today they return
  `undefined` / an empty list / never emit). An extension **cannot** query
  another one.
- Editing the buffer (`TextEditor.edit`) → **missing**. `TextEditor.setDecorations`
  → **real** (same underline channel as diagnostics).

## Base types and values

`Uri`, `Position`, `Range`, `Selection`, `TextLine`, `FileStat`,
`RelativePattern`, `CancellationTokenSource`, `CancellationError`, `EventEmitter`,
`Disposable`, `MarkdownString`, `MessageItem`, `ThemeColor`, `ThemeIcon`,
`TreeItem`, `TreeItemCollapsibleState`, `version` → **real**.

**Data classes** (`Diagnostic`, `TextEdit`, `WorkspaceEdit`, `Hover`,
`CodeLens`, `CodeAction`, `Completion*`, `SymbolInformation`, `DocumentSymbol`,
`InlayHint`, `CallHierarchy*`, `TypeHierarchy*`, `SemanticTokens*`,
`SelectionRange`, `FoldingRange`, `Location`, `EvaluationResult`…) exist so the
extension can **build** them; the editor consumes them once the feature is there.

**Enums** (`SymbolKind`, `DiagnosticSeverity`, `ViewColumn`, `StatusBarAlignment`,
`FileType`, `EndOfLine`, … 42 in total) all exist: the bundle's static
initializers read them at load time, and if one were missing the extension would
not even reach `activate`.

## Next steps

- [Extension Host](../architecture/extension-host.md) — how this code runs.
- [VS Code compatibility](../architecture/vscode-compatibility.md) — how a `.vsix`
  is translated to SEF.
