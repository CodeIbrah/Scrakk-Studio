---
title: "Encodings"
group: features
order: 280
summary: "How the IDE detects and picks the text encoding when opening a file, the built-in codecs, the encoding chip and the save path."
---
# Encodings

Opening a file is a byte problem before it is a text problem. The IDE
**detects** the encoding on read, keeps it per document, and never converts
silently. Saving re-encodes with the document's choice. The status bar's
**encoding chip** shows the result and is the entry point for re-opening a file
with another encoding.

## Detection on open

The only byte-with-encoding door is `main/encodings/service.ts`
(`readFileEncoded`), which calls `detectEncoding` (`main/encodings/detect.ts`).
The order matters:

1. **BOM**: UTF-8 (`EF BB BF`) → `utf8-bom`; UTF-16 LE (`FF FE`) →
   `utf16le-bom`; UTF-16 BE (`FE FF`) → `utf16be-bom`. BOMs run **before** the
   binary check: a UTF-16 file legitimately contains NULs.
2. **Binary**: if the sample (64 KB) is more than 1% NULs, or has 4 consecutive
   NULs in the first 4 KB, `binary: true` and the read fails as binary.
3. **Strict UTF-8**: a `TextDecoder('utf-8', { fatal: true })` on the sample
   succeeds → `utf8`, `lossy: false`.
4. **Fallback**: Windows-1252 (`latin1`), flagging `lossy` if it produced U+FFFD
   replacements.

The BOM is stripped from the decoded text; the fact is kept in `detected.hasBom`.

## Built-in codecs

`main/encodings/codecs/index.ts` lists `BUILTIN_CODECS`; the array order is the
order in the picker:

| Id | Label |
|---|---|
| `utf8` | UTF-8 |
| `utf8-bom` | UTF-8 BOM |
| `utf16le` | UTF-16 LE |
| `utf16le-bom` | UTF-16 LE BOM |
| `utf16be` | UTF-16 BE |
| `utf16be-bom` | UTF-16 BE BOM |
| `latin1` | Windows-1252 |

A codec is a `IEncodingCodec` (`@shared/encodings`): `decode(bytes)`,
`encode(text)` and an optional `bom` byte sequence. Detection only ever returns
`utf8`, `utf8-bom`, `utf16le-bom`, `utf16be-bom` or `latin1`; the plain
`utf16le`/`utf16be` codecs exist for encoding a save.

## Per-document state

`@services/encodings/documentState` is a reactive store keyed by path:

```ts
interface DocumentEncoding {
  encoding: EncodingId
  hasBom: boolean
  lossy: boolean
  lineEnding: LineEnding   // 'LF' | 'CRLF'
  eolDirty?: boolean
}
```

`fileSession.ts` calls `setDetected(path, text, detected)` after a successful
read; the store also computes `lineEnding` with `detectLineEnding`. It is capped
at 200 documents (the oldest is evicted) and `forget(path)` drops a document on
close. `subscribe(listener)` drives the UI.

## Saving

`features/editor/save.ts` reads the document state and calls:

```ts
await writeEncoded({
  path,
  text: session.getText(),
  encoding: doc?.encoding ?? 'utf8',
  preserveBom: doc?.hasBom ?? true,
  lineEnding: doc?.lineEnding
})
```

The main service normalizes EOL (`convertLineEndings`) when `lineEnding` is set,
then encodes. If `preserveBom: false` is requested on a `-bom` codec, it uses the
plain counterpart (`utf8-bom` → `utf8`, `utf16le-bom` → `utf16le`, …).
`saveActiveFileWith(encoding, preserveBom, lineEnding)` exists for re-saving with
another encoding, but no UI calls it today — the chip only re-opens.

## The encoding chip

`EncodingChip` (`features/statusbar`) renders the active document's label —
`UTF-8`, `UTF-8 BOM`, `UTF-16 LE`, `UTF-16 BE`, `Windows-1252` — appending
` · CRLF` when the EOL is CRLF, and styles it as `lossy` when replacements were
made. Clicking opens the `pickOption` modal:

1. **Reopen with…** lists `listEncodings()` with the current one disabled.
2. It re-reads the file and calls `setDetected` + `reloadFileContent`.
3. It then offers **Convert EOL** to LF or CRLF (applied on save).

## Extension codecs

`registerDynamicCodecs(extensionId, codecs)` registers metadata in the main
registry; built-in ids can never be overridden. A dynamic codec has no
implementation in the main, so reads are returned as base64
(`delegatedToRenderer: true`, `rawBytes`) and the renderer converts. See the
guide linked below.

## Limits

- The main read IPC accepts only `{ path }`; the `overrideEncoding` option exists
  in `readFileEncoded` but is not reachable from the renderer. "Reopen with…"
  therefore re-labels the already-decoded text (`readEncodedOverride`) instead of
  re-decoding bytes — switching between two built-in encodings does not truly
  reinterpret the file, and a dynamic codec falls back to lossy UTF-8.
- Detection is heuristic by design (no charset heuristics beyond BOM + strict
  UTF-8), so a valid UTF-8 file is never flagged, but a legacy 8-bit file lands
  on Windows-1252.
- `saveActiveFileWith` is not wired to any button; the chip's EOL choice only
  takes effect at save through the document state.
- The document store holds at most 200 files.

## Next steps

- [Formats and encodings](../extensions/guides/file-handlers.md) — add a codec.
- [Status bar](status-bar.md) — where the encoding chip lives.
- [File viewers](file-viewers.md) — how non-text files are shown.
- [The editor](../editor/editor.md) — save and file sessions.
