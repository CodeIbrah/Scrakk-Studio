---
title: "Onboarding"
group: features
order: 220
summary: "The first-run setup wizard: five registry-driven steps, the real steps that apply at once, and the preview-only steps, plus how it is triggered and persisted."
---
# Onboarding

**Onboarding** is the first-run setup wizard (title: *Initial setup*). It is a single painter,
`OnboardingWizard`, mounted once in `App` inside an `OnboardingProvider`. The wizard knows no
concrete step: the step list, order, side navigation and the final summary all come from a
registry, so a new step is a new component plus one registry entry.

> **Beta:** the wizard is currently hidden. `ONBOARDING_ENABLED = false` in
> `features/onboarding/config.ts` makes it paint nothing and skip its palette
> command. The registry and builtin steps stay in place; flip the flag to
> re-enable it. This page documents the feature as designed.

## How it is triggered

There is no separate "first launch" flag. The trigger is the **absence of a persisted
status**. `readState()` builds the initial machine state from storage; a missing status means
`running` and the wizard opens at the saved step (0 if none). The status and the step are
persisted through `@services/storage` (localStorage keys are prefixed with `scrakk:`):

| Key | Meaning | Default |
|---|---|---|
| `scrakk:onboarding.status` | `'running'` (shown) or `'done'` (finished/skipped) | absent → `running` |
| `scrakk:onboarding.step` | Index the wizard resumes at | `0` |

Reopening is explicit: the registry command `onboarding.open` (title
`onboarding.ver.configuracion.inicial`, "View default settings") calls `reopen()`, which goes
back to step 0 without clearing anything already applied. Closing with **Esc**, a click
outside, the **X** or **Skip configuration** calls `finish()` → `done`; the wizard does not
reopen on its own afterwards.

## The steps

`features/onboarding/steps/index.ts` is the only file that knows the catalogue and the order.
Steps are sorted by `order` (default `100`), then by id. All built-ins are fake-or-real as
declared, and every one reports its kind in the header badge.

| # | Id | Label | Kind | Badge | What it does |
|---|---|---|---|---|---|
| 1 | `welcome` | Welcome | `fake` | Preview | Highlights editor / terminal / extensions / layout (demo data) |
| 2 | `theme` | Appearance | `real` | Apply now | Lists real themes and calls `activateTheme(id)` |
| 3 | `privacy` | Privacy | `real` | Apply now | Persists the usage-data preference |
| 4 | `keymap` | Shortcuts | `fake` | Preview | Shows Scrakk / VS Code / JetBrains / Vim profiles |
| 5 | `ready` | Done | `fake` | Preview | Summary of the choices, with a **Change** button per row |

### Real steps apply immediately

- **Appearance** (`ThemeStep`) reads the theme stream from `@services/extensions`
  (`listRegisteredThemes`, `subscribeToThemes`). Selecting a card calls `activateTheme(id)`,
  which applies and persists the theme — the same action as Settings → Appearance. Cards show
  the theme's real palette (`accent`, `editorBg`/`surface`, `bg`); there are `all` / `dark` /
  `light` filters and a name search.
- **Privacy** (`PrivacyStep`) toggles usage data. `getPersistedTelemetryEnabled()` defaults to
  **off** (`true` only when explicitly stored). Toggling calls `applyTelemetryEnabled(next)`,
  which persists and publishes to live extension hosts, then `markTelemetryAsked()`. Scrakk
  sends no telemetry of its own; the flag exists so extensions can read the real IDE state.

### Preview steps say so

`WelcomeStep`, `KeymapStep` and `ReadyStep` are mock-ups: they import no service (a test reads
the imports of `steps/fake/**` and fails if one slips in). `KeymapStep` explicitly states the
profiles are "a preview: they are not yet applied or saved", and `ReadyStep` separates what was
already applied (theme, privacy) from what is only a preview.

## Writing a step

The wizard injects a `StepContext`; a step never touches the wizard or the registry directly.

```ts
import { registerOnboardingStep, type OnboardingStep } from '@features/onboarding'

registerOnboardingStep({
  id: 'my-step',
  label: 'My step',        // side-nav label
  title: 'My step',        // big heading
  subtitle: 'One line.',
  icon: 'compass',         // ProductIcon id
  kind: 'real',            // 'real' applies now, 'fake' is UI-only
  order: 35,
  component: MyStep
})
```

`StepContext` gives `next`, `back`, `finish`, `openStep(id)`, the `choices` record, this step's
`choice` and `setChoice`. The summary is fed by `choices`; the value is display text (theme
name, "Telemetry enabled"), not a decision the wizard interprets.

## How it is persisted

Each transition persists explicitly — there is no timer or effect. `next`/`back`/`goTo` write
the step index; `next` past the last step (or an empty list) and `finish` write `done`. The
`choices` map lives **in memory only**: real steps persist their own decision (theme store,
telemetry storage); fake steps have nowhere to persist. The progress bar and the side-nav marks
come from `progressOf()` (`current` / `visited` / `pending`), and the counter renders as
`N de M`.

## Limits

- `keymap` profiles are demo-only: choosing one changes nothing.
- Telemetry is global; the per-extension exception is not implemented yet.
- `ONBOARDING_RESET_EVENT` (`onboarding:reset`) is exported but has no listener wired.
- `skippable: false` is reserved for security/licence steps; no built-in uses it and the skip
  button is always shown.
- Choices are not persisted, so the summary is empty again after a restart.
- After a skip the wizard never re-asks automatically.

## Next steps

- [Settings](settings.md) — the Appearance and Permissions sections the real steps mirror.
- [Extensions](../extensions/README.md) — where the theme stream comes from.
- [Panels & features](README.md) — the rest of the panels and features.
