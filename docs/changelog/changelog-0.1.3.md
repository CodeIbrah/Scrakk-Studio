---
title: "Changelog 0.1.3"
group: changelog
order: 30
summary: "Relevant changes in Scrakk Studio. The welcome screen shows the first entry (the newest) in the Announcements section, so the newest goes on top."
---
# Changelog

Relevant changes in Scrakk Studio. The **welcome screen** shows the first
entry (the newest) in the **Announcements** section, so the newest goes on top.

Format: `## <version> — <title>` and bullets per area. Entries already
published are not edited. The file goes per version:
`docs/changelog/changelog-<x.y.z>.md`.

---

## 0.1.3 — TBD

### Welcome (UI)
- **The 3 buttons on the welcome screen actually work**: they called props that
  **nobody passed** (`PanelHost` mounts the panel with no props, so the
  `() => {}` defaults made them look perfect and do **nothing**). Now **New
  file**, **Open file**, and **Open folder** call the real actions: the native
  file dialog (multi-selection, each file opens in the editor), the native
  folder dialog (the chosen folder becomes the workspace), and creating a new
  file in the workspace — if no workspace is open, the folder is requested first
  — which opens in the editor. The three live in `@features/explorer` and the
  **File menu reuses them** instead of keeping its own copy.

### Fixes
- **Sending a photo no longer adds a 📷 next to it**: the `body` of a message
  could not be empty (`messages_body_check` required
  `char_length(body) >= 1`), so an image-only message was filled with the `'📷'`
  character just to pass the constraint. That emoji was **real data**: it
  travelled to the other side and was painted as the message text, above the
  image. Now a message whose only content is attachments goes with an **empty
  body** (migration `0025_messages_empty_body.sql` relaxes the CHECK for
  `normal` messages; `codefile` messages still require their JSON envelope), and
  the app rejects a send that has neither text nor attachments. The reply
  previews and the incoming-message notice show "Attached image" instead of a
  blank line when the quoted/arriving message has no text.
