---
title: "Skills (in the chat)"
group: chat
order: 70
summary: "The chat's skill surface: the 'skills: N' button below the composer, the in-panel skills view, and the Settings → Chat → Skills toggle."
---
# Skills (in the chat)

This page is the **chat side** of skills: the button that opens them, the view
inside the chat panel, and the on/off switch in Settings. It complements
[Packaging a skill](../extensions/guides/skills.md), which covers how an
extension ships `SKILL.md` files. A skill is a folder with a `SKILL.md`
(frontmatter `name` + `description`, then markdown), living in
`.scrakk/skills/<name>/SKILL.md` at the project or user level, or contributed by
an installed `.sef`.

## The `skills: N` button

`SkillsButton` (`features/layout/panels/ChatPanel/SkillsButton.tsx`) sits in the
`ComposerFooter` under the chat input, next to the mode, variants and model
controls:

```tsx
// SkillsButton.tsx
const [count, setCount] = useState(() => skillRegistry.list().length)
useEffect(() => {
  skillRegistry.start()
  return skillRegistry.subscribe(() => setCount(skillRegistry.list().length))
}, [])
return <button onClick={() => toggleSkillsView()}>skills: {count}</button>
```

`N` is the number of **loaded** skills, not the number of enabled ones. When the
panel is narrower than `HIDE_SKILLS = 400` px the button is hidden; its action
moves into the "⋯" overflow menu (`ComposerFooter.tsx`), which shows the same
count as `{skillCount} cargadas`.

## The in-chat skills view

The button does **not** open a panel: it toggles a view that **replaces the chat
content** (the same pattern as the history view). The state lives in
`features/layout/panels/SkillsPanel/viewState.ts`
(`isSkillsViewOpen` / `setSkillsViewOpen` / `toggleSkillsView` /
`subscribeToSkillsView`). `ChatPanel.tsx` subscribes to it and renders:

```tsx
{showSkills ? (
  <div className={styles.historyView} data-skills-view="">
    <SkillsPanel />
  </div>
) : showHistory ? (
  <div className={styles.historyView} data-history-view="">
    <HistoryPanel onPick={() => setHistoryViewOpen(false)} />
  </div>
) : (
  chatBody
)}
```

Opening skills closes history and vice versa. While the view is open the header
shows the title `Skills` and a single button back to the chat; opening history
from the header also closes skills.

`SkillsPanel.tsx` can list, create, insert and delete:

- **Nueva** reveals a form (name, description, body). `installSkill()` writes
  `.scrakk/skills/<name>/SKILL.md` with the standard frontmatter, in the
  `project` or `user` scope chosen from a context menu. The name must match
  `/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/`; a project skill needs an open
  workspace root.
- The chat icon calls `insertSkillIntoChat(name)` (`services/chat/chatApi.ts`):
  it loads the body and dispatches `chat:insert`. The active `ChatPanel` listens
  and appends a **user** message wrapped as `<skill name="…">…</skill>`.
- The trash icon deletes a skill (with a confirmation modal). Extension-provided
  skills (`source === 'extension'`) have no delete button.
- A status/error log fades out after 3 s. Each row shows a source badge:
  `proyecto`, `usuario` or `extensión`.

The registry (`services/skills/registry.ts`) scans `user` first then `project`
(project overrides by name) and finally extension skills. It watches both
`.scrakk/skills` folders and debounces refreshes by 150 ms; `skillRegistry.start()`
is idempotent and is called once from `App.tsx`.

## Settings → Chat → Skills

Settings has a dedicated **Skills** section
(`features/settings/sections/chat/SkillsSection.tsx`) reached from Settings →
Chat, or directly with `open-settings` `{ section: 'chatSkills' }`. It lists every
skill and gives each a `ToggleSwitch`:

```tsx
<ToggleSwitch
  checked={skillRegistry.isEnabled(skill.name)}
  onChange={(next) => skillRegistry.setEnabled(skill.name, next)}
/>
```

Enabled/disabled state is stored in `localStorage` under
`scrakk-studio:skill-settings` as `{ disabled: string[] }` (disabled names only).
A disabled skill is **not offered to the model**: it disappears from
`list_skills` and `skill` returns `Skill "<name>" is disabled.`

## How the model sees them

Two built-in tools read this registry (see [AI tools](tools.md)):

- `list_skills` returns the **enabled** skills as JSON with `name`,
  `description` and `source`:

  ```json
  [
    { "name": "release-notes", "description": "Generates release notes.", "source": "project" }
  ]
  ```

- `skill` loads the body of one skill by `name`. This is progressive disclosure:
  the model sees name + description while discovering and pulls the markdown only
  when it needs it.

## Limits

- `skills: N` counts all loaded skills; the number does not drop when a skill is
  turned off in Settings.
- A skill is instructions, not code; nothing runs. If it must run, it is a tool.
- The panel creates skills by hand; there is no import from a folder or URL.
- Extension skills are read-only here: no delete, and the badge is fixed.
- The toggle is local to this profile (localStorage); it is not per provider or
  per project.
- While the skills view is open you cannot see the conversation: it replaces the
  chat body.

## Next steps

- [Packaging a skill](../extensions/guides/skills.md) — `contributes.skills` in a `.sef`.
- [AI tools](tools.md) — `list_skills` and `skill` in the registry.
- [AI chat](chat.md) — sessions, streaming and the composer footer.
- [Modes and permissions](permissions.md) — what the agent may execute.
- [Subagents](subagents.md) · [Slash commands](slash-commands.md) · [Models & providers](providers.md)
- [SEF extensions](../extensions/README.md)
