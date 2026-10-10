---
title: "Notes"
group: features
order: 80
summary: "The Notes panel: a small scratchpad store (create, list, edit, delete) persisted in localStorage, with a new-note button in the header."
---
# Notes

The **Notes** panel is a lightweight scratchpad: create notes, list them, edit
inline, delete. It is a normal panel (`PANEL_REGISTRY` id `notes`,
`features/layout/panels/NotePanel/NotePanel.tsx`) with a **`+` header action** and
a store in `@services/notes`.

## The store

`@services/notes` is a tiny external store (CRUD + `subscribe`), persisted in
**localStorage** under `scrakk-studio:notes` (falls back to in-memory when there
is no storage):

```ts
import { listNotes, createNote, updateNote, deleteNote, subscribeToNotes } from '@services/notes'

const notes = listNotes()            // sorted by updatedAt desc, then createdAt
const note = createNote()            // { id, content: '', createdAt, updatedAt }
updateNote(note.id, 'hello')         // updates content + updatedAt
deleteNote(note.id)
subscribeToNotes(() => setNotes(listNotes()))
```

- **Title**: derived from the first non-empty line (`noteTitle`).
- **Persistence**: the whole list is JSON-serialized to localStorage on every
  change; a corrupt value starts empty.

## The panel

- Header **`+`** (`HeaderActionButton` id `notes.new-note`) creates a note and
  selects it.
- A **list** (by update time) on top and an inline **editor** below.
- Each row has a **delete** (trash) action on hover.
- Empty state offers a "New note" button.

## Limits

- Notes are **local to the app** (localStorage), not synced to any account or
  workspace: opening another project shows the same notes.
- Plain text only: no markdown rendering, tags, search or folders.
- The store is renderer-only; it does not touch disk.

## Next steps

- [Panels & features](README.md) — the other built-in panels.
- [Panels](../extensions/guides/panels.md) — how a panel and its header actions work.
