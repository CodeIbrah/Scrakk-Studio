// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * API pública del sistema i18n (compartida por renderer y main).
 *
 * - Funciones puras en `./engine` (interpolación, plural, fallback).
 * - Catálogos en `./catalogs` (`es` es la base).
 * - Aquí vive el ESTADO del idioma activo + los suscriptores.
 *
 * No importa React, DOM ni storage: el renderer envuelve esto en
 * `@core/i18n` (hook `useT` + persistencia de la preferencia).
 */

import { catalogs, type MessageKey } from './catalogs'
import { translate, type TranslateResult } from './engine'
import type { Locale, LocalePreference, Vars } from './types'

export { LOCALES } from './types'
export type { Locale, LocalePreference, Vars } from './types'
export { interpolate, translate } from './engine'
export type { Catalog, Catalogs, TranslateResult } from './engine'
export { catalogs } from './catalogs'
export type { MessageKey } from './catalogs'

/** Idioma base (fuente de verdad). Nunca se traduce. */
export const BASE_LOCALE: Locale = 'es'

let currentLocale: Locale = BASE_LOCALE
const listeners = new Set<() => void>()

/** Repunte opcional para claves faltantes (solo dev: log de diagnóstico). */
let missingReporter: ((key: string, locale: Locale) => void) | null = null

export function setMissingKeyReporter(reporter: ((key: string, locale: Locale) => void) | null): void {
  missingReporter = reporter
}

export function getLocale(): Locale {
  return currentLocale
}

/**
 * Cambia el idioma ACTIVO (no persiste nada; de eso se encarga `@core/i18n`).
 * Notifica a los suscriptores para que React vuelva a renderizar con `useT`.
 */
export function setLocale(next: Locale): void {
  if (next === currentLocale) return
  currentLocale = next
  for (const listener of [...listeners]) listener()
}

export function subscribeToLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Idioma más cercano soportado según el sistema operativo. Prefiere `es`
 * cuando el sistema está en español y cae al base para cualquier otro.
 */
export function detectSystemLocale(): Locale {
  const tags: string[] = []
  if (typeof navigator !== 'undefined') {
    const langs = (navigator as Navigator & { languages?: readonly string[] }).languages
    if (Array.isArray(langs)) tags.push(...langs)
    if (navigator.language) tags.push(navigator.language)
  }
  for (const tag of tags) {
    const primary = String(tag).toLowerCase().split('-')[0]
    if (primary === 'es') return 'es'
    if (primary === 'en') return 'en'
  }
  return BASE_LOCALE
}

/** Resuelve la preferencia del usuario (incluye `system`) a un idioma real. */
export function resolveLocale(preference: LocalePreference): Locale {
  return preference === 'system' ? detectSystemLocale() : preference
}

/** Igual que `t`, pero devuelve además el diagnóstico (missing / fallback). */
export function translateKey(key: MessageKey, vars?: Vars): TranslateResult {
  return translate(catalogs, currentLocale, BASE_LOCALE, key, vars)
}

/**
 * Traduce una clave al idioma activo. `vars.count` activa el plural
 * (`clave.one` / `clave.other`). Si la clave falta, se cae al base y, en
 * último caso, se devuelve la propia clave (error visible en dev).
 */
export function t(key: MessageKey, vars?: Vars): string {
  const result = translateKey(key, vars)
  if (result.missing && missingReporter) missingReporter(key, currentLocale)
  return result.text
}
