---
title: "Themes & icons"
group: features
order: 150
summary: "Three independent theme systems: color themes (CSS tokens), file icons and product/UI icons."
---
# Themes & icons

Appearance is **three independent systems**, each with its own registry and active
selection:

1. **Color themes** — the app's colors (`--color-*` tokens).
2. **File icons** — the icons in the explorer and tabs.
3. **Product/UI icons** — the icons in buttons, tabs and chevrons.

## Color themes

A color theme is an extension contribution (`contributes.themes`) that redefines
the app's CSS tokens. It is applied live through `@services/extensions`:

```ts
import { listRegisteredThemes, activateTheme, getActiveThemeId, subscribeToThemes } from '@services/extensions'

activateTheme('ayu-dark')          // returns false if the id is unknown
getActiveThemeId()                 // the current theme id
subscribeToThemes(() => {/* … */})
```

- The theme's `type` (`dark`/`light`) groups it in the picker.
- Colors: a `color` value maps to a `--color-*` token (`bg`, `surface`, `accent`,
  `text`, `border`, `diffAdded`, …). Colors a theme does not define fall back to
  the app's base theme for that `type` — no hard defaults.
- Extra: a background **image** (`background`), UI **fonts** (`fonts.ui`), and
  `flat` for single-color chrome.
- Picked in **Settings → Appearance**; see
  [Color themes](../extensions/guides/themes.md) to build one.

## File icons

A **file-icon theme** maps file names/extensions/languages to icons. It is a
global registry with one active theme:

```ts
import { listFileIconThemes, getActiveFileIconThemeId, setActiveFileIconTheme, useFileIconUrl } from '@services/fileIcons'

const url = useFileIconUrl('main.ts', false, undefined, { path: 'src/main.ts' })
setActiveFileIconTheme('material-icon-theme')
```

- The default is **Material Icon Theme** (MIT), shipped as a builtin.
- Consumers: the **explorer** (declarative hook) and **tabs/layout** (imperative
  `getFileIconUrl`); both follow the active theme.
- Theme JSON uses **data-URI** icon definitions; see
  [Icons](../extensions/guides/icons.md).
- Listed in **Settings → Extensions** (the "File icons" section).

## Product / UI icons

A **product-icon theme** maps UI ids (`files`, `search`, `chevron-down`, …) to
font glyphs. The builtin is called **Scrakk / ProIcons** (`scrakk`):

```ts
import { listProductIconThemes, getActiveProductIconThemeId, setActiveProductIconTheme, resolveProductIcon, SCRAKK_PRODUCT_ICON_THEME_ID } from '@services/productIcons'

resolveProductIcon('search')                 // the active theme's glyph (or builtin fallback)
setActiveProductIconTheme(SCRAKK_PRODUCT_ICON_THEME_ID)
```

- Theme JSON: `fonts[]` (data URI) + `iconDefinitions` (`fontCharacter`); see
  [Icons](../extensions/guides/icons.md).
- Listed in **Settings → Extensions** (the "UI icons" section).

## Persistence

The active color theme, file-icon theme and product-icon theme are each persisted
and re-applied on startup; changing one re-renders the consumers through their
`subscribe` streams.

## Limits

- No per-scope color overrides at runtime (that is what the theme JSON is for).
- Product-icon themes only support **font** glyphs (no SVG per id).
- Themes do not carry `fontStyle` for syntax scopes to the engine yet (see
  [Languages](../editor/languages.md) limits).

## Next steps

- [Color themes](../extensions/guides/themes.md) and [Icons](../extensions/guides/icons.md)
  — how to create them.
- [Settings](settings.md) — where they are picked.
