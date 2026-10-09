---
title: "Skills"
group: extensions
order: 130
summary: "Packaging skills (Agent Skills standard) inside a .sef extension."
---
# Skills

An extension can **package skills** (the *Agent Skills* standard): each entry
points to a `SKILL.md` inside the package. A "pack" is simply an extension with
several entries under `contributes.skills`.

```json
{
  "skills": [
    {
      "name": "release-notes",
      "description": "Generates release notes from merged PRs.",
      "path": "skills/release-notes/SKILL.md"
    }
  ]
}
```

| Field | Type | Required |
|---|---|---|
| `name` | string (regex `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`) | yes |
| `description` | string | yes |
| `path` | string (path to the `SKILL.md`) | yes |

## How the model sees them

**Progressive disclosure**: the model sees **name + description** when it needs to
discover what is available, and pulls the **body** of the `SKILL.md` only when it
needs it (the `skill` tool loads the content; `list_skills` lists them).

## Notes

- The `path` must exist inside the package.
- It does not run code: a skill is a document of instructions/workflow.
- Project/user skills (`.scrakk/skills/<name>/SKILL.md`) are a separate source; an
  extension adds its own.

## Next steps

- [Contributes](../reference/contributes.md) — the exact schema.
- [AI tools](tools.md) — if yours runs code, it is a tool.
