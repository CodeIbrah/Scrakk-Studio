---
title: "Formats and encodings"
group: extensions
order: 140
summary: "Two contributions for handling files: fileHandlers (your viewer) and encodings (your text codec)."
---
# Formats and encodings

Two contributions let you handle files that are not plain text: **`fileHandlers`**
(your own viewer for certain files) and **`encodings`** (a text codec).

## `fileHandlers` — your viewer

Declares which files your extension grabs and how they are shown.

```json
{
  "fileHandlers": [
    {
      "id": "acme-viewer",
      "match": { "extensions": ["acme"], "languageIds": ["acme"] },
      "mode": "view",
      "priority": 10,
      "component": "viewers/Acme.tsx"
    }
  ]
}
```

| Field | Type | Required |
|---|---|---|
| `id` | global string | yes |
| `match` | `{ extensions?, globs?, languageIds?, scheme? }` | yes (at least one condition) |
| `mode` | `view` \| `text` \| `both` | no (default `text`) |
| `priority` | number (higher wins) | no |
| `component` | module (the viewer) | no |

- `mode`: `view` = a piece (read-only/viewer), `text` = the text editor,
  `both` = in between.
- With no condition at all in `match`, the handler would grab **everything**: it
  is dropped.
- It enters the **same registry** as the builtin handlers, so it competes by
  priority.

## `encodings` — your codec

Contributes a text encoding the IDE offers when opening/saving files.

```json
{
  "encodings": [
    { "id": "koi8-r", "label": "KOI8-R", "module": "./encoding.js" }
  ]
}
```

| Field | Type | Required |
|---|---|---|
| `id` | string (cannot override a builtin) | yes |
| `label` | string | yes |
| `module` | string (relative path, **must** start with `./`) | yes |

The `module` is an ESM file in the package whose `export default` implements:

```js
export default {
  decode(bytes /* Uint8Array */) { return '…' },
  encode(text /* string */) { return new Uint8Array(/* … */) }
}
```

The `logic` validates that shape before registering; if it does not match, the
contribution is dropped with a warning without breaking anything.

## Notes

- The `id`s of both contributions are global. `encodings` cannot overwrite a
  builtin encoding.
- The CLI does **not** bundle `fileHandlers.component` yet (see
  [CLI](../reference/cli.md)).

## Next steps

- [Contributes](../reference/contributes.md) — the exact schemas.
- [Editor → Languages](../../editor/languages.md) — language resolution.
