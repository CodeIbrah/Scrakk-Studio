---
title: "File timeline"
group: features
order: 300
summary: "The per-file event timeline: what fileTimelineService records, how it persists, and the Timeline tool-dock panel."
---
# File timeline

The **file timeline** is a per-file log of actions — *created, opened, modified,
saved, closed* — with a timestamp and an optional detail. It is an event history,
not a set of content versions: it records *what happened*, not snapshots of the
file. It is shown by the **Timeline** tool-dock item and backed by
`@services/fileTimeline`.

## What it records

`@services/fileTimeline` exports a singleton `fileTimelineService`. An entry is:

```ts
type TimelineAction = 'created' | 'opened' | 'modified' | 'saved' | 'closed'

interface TimelineEntry {
  id: string
  filePath: string
  action: TimelineAction
  timestamp: Date
  detail?: string
}
```

`addEntry(filePath, action, detail?)`:

- **Deduplicates**: if the last entry has the same action and is less than
  1000 ms old, it returns without writing (so repeated events do not flood).
- **Prepends** the new entry and keeps at most **100** entries in memory.
- **Persists** to `localStorage` under `fileTimelines`, writing only the last
  **50** entries per file.
- Notifies subscribers with the affected `filePath`.

Timestamps are stored as ISO strings and revived as `Date` on load; the
constructor calls `load()` once.

## Reading it

```ts
fileTimelineService.getForFile(path): TimelineEntry[]   // newest first
fileTimelineService.getCreatedDate(path): Date | undefined
fileTimelineService.subscribe((filePath) => void): () => void
fileTimelineService.clear(path?)                         // one file or all
```

`getCreatedDate` returns the first `created` entry, or the oldest entry as a
fallback.

## The Timeline panel

The **Timeline** tool-dock item (`features/tooldock/items/timeline`) is
registered with:

| Field | Value |
|---|---|
| `id` | `timeline` |
| `title` | `t('features.linea.de.tiempo')` |
| `icon` | `history` |
| `order` | 20 |
| `hosts` | `['explorer']` |

When it mounts or `currentFile` changes, it records `opened` for the active file
(the service deduplicates events closer than one second), reads
`getForFile(currentFile.path)`, and subscribes for updates on that same path.
Each row shows an action icon (`created` → `add`, `opened` → `folder-open`,
`modified` → `pencil`, `saved` → `checkmark`, `closed` → `close`), the action
name, an optional detail, and a relative time (`Hace N min`, `Hace N h`,
`Hace N d`, else a short date). With no active file it shows
`features.abre.un.archivo.para.ver-2`; with no entries,
`features.sin.actividad.registrada.todavia`.

## Limits

- **Only `opened` is recorded today.** The service supports all five actions,
  but the only caller of `addEntry` is the Timeline panel, which logs `opened`.
  Nothing pushes `created`, `modified`, `saved` or `closed`, so the timeline is
  effectively an open history. The other actions are a wired-but-unused part of
  the model.
- It stores **events**, not file contents — there is no diff, restore or version
  navigation.
- The panel only ever shows the active file; there is no "all files" timeline.
- History is capped (100 in memory, 50 persisted per file) and lives in
  `localStorage`, so it is tied to the client, not the workspace.
- Only the Explorer hosts the tool dock.

## Next steps

- [Tool dock](tool-dock.md) — the pill that hosts the panel.
- [Bookmarks](bookmarks.md) and [Outline](outline.md) — the sibling items.
- [The editor](../editor/editor.md) — file sessions and the active-file bus.
- [Layout & panels](layout.md) — where the Explorer mounts the dock.
