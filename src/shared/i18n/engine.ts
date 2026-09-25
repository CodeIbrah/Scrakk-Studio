// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Motor de traducción: funciones PURAS (sin estado, sin DOM, sin red).
 *
 * Toda la app resuelve sus textos con esto. No hay traducción en runtime: las
 * claves se resuelven contra catálogos estáticos y, si falta una, se cae al
 * idioma base (`es`). El resultado se cachea en el render de React, no aquí.
 */

import type { Locale, Vars } from './types'

/** Un catálogo: clave plana (`area.clave`) → texto. */
export type Catalog = Readonly<Record<string, string>>

/** Catálogos por idioma. Puede faltar un idioma entero (se cae a la base). */
export type Catalogs = Readonly<Partial<Record<Locale, Catalog>>>

export interface TranslateResult {
  /** Texto final, ya interpolado. Si la clave no existe, es la clave misma. */
  text: string
  /** La clave no existe en NINGÚN catálogo (ni en el base). */
  missing: boolean
  /** La clave existía, pero no en el idioma pedido: se usó el base. */
  fellBackToBase: boolean
  /** Clave realmente usada (puede ser `clave.one` / `clave.other`). */
  resolvedKey: string
}

const PLACEHOLDER = /\{([a-zA-Z0-9_.]+)\}/g

/** Normaliza el valor de `count` (número o string numérico) para el plural. */
function countOf(vars?: Vars): number | null {
  if (!vars) return null
  const raw = vars['count']
  if (raw === undefined) return null
  const value = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(value) ? value : null
}

/**
 * Reemplaza `{nombre}` por su valor. Los placeholders sin valor se dejan
 * intactos (así el error es visible en la UI y no se pierde el token).
 */
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(PLACEHOLDER, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  )
}

/**
 * Resuelve una clave contra los catálogos.
 *
 * Orden de búsqueda con plural (`vars.count` presente):
 *   1. `<clave>.one` / `<clave>.other` en el idioma pedido
 *   2. `<clave>` (sin sufijo) en el idioma pedido
 *   3. las mismas dos en el idioma base
 */
export function translate(
  catalogs: Catalogs,
  locale: Locale,
  base: Locale,
  key: string,
  vars?: Vars
): TranslateResult {
  const count = countOf(vars)
  const candidates =
    count === null ? [key] : [`${key}${count === 1 ? '.one' : '.other'}`, key]

  for (const candidate of candidates) {
    const text = catalogs[locale]?.[candidate]
    if (text !== undefined) {
      return { text: interpolate(text, vars), missing: false, fellBackToBase: false, resolvedKey: candidate }
    }
  }

  for (const candidate of candidates) {
    const text = catalogs[base]?.[candidate]
    if (text !== undefined) {
      return {
        text: interpolate(text, vars),
        missing: false,
        fellBackToBase: locale !== base,
        resolvedKey: candidate
      }
    }
  }

  return { text: key, missing: true, fellBackToBase: false, resolvedKey: key }
}
