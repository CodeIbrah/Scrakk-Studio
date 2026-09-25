// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Tipos base del sistema de internacionalización (i18n).
 *
 * `es` es el idioma BASE (fuente de verdad): todo texto de UI nace ahí y el
 * resto de los idiomas se derivan. El idioma base nunca se traduce.
 */

/** Idiomas soportados. El primero (`es`) es la base. */
export const LOCALES = ['es', 'en'] as const

export type Locale = (typeof LOCALES)[number]

/**
 * Preferencia del usuario: un idioma concreto o `system` para seguir el
 * idioma del sistema operativo (resuelto al más cercano soportado).
 */
export type LocalePreference = 'system' | Locale

/** Valores de interpolación de una traducción: `{nombre}` → valor. */
export type Vars = Record<string, string | number>
