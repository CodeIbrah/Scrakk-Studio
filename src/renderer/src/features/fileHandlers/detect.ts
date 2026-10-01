// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Detección del handler de un archivo.
 *
 * Combina extensión + globs + languageId (`detectLanguageFromPath`) + esquema,
 * igual que un `FileIconTheme` resuelve su ícono. Sin tabla global de formatos:
 * cada handler declara su propio `match` y acá solo se resuelve quién gana.
 */

import { detectLanguageFromPath } from '@features/editor/languages'
import type { FileHandler, FileHandlerMatch } from './types'

/** `foo/Bar.TS` → `ts` ('' si no tiene extensión). */
export function extensionOf(path: string): string {
  const base = path.split(/[/\\]/).pop() ?? ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return ''
  return base.slice(dot + 1).toLowerCase()
}

/** `foo/Bar.ts` → `Bar.ts`. */
export function baseNameOf(path: string): string {
  return path.split(/[/\\]/).pop() ?? path
}

/** `scrakk-view://x` → `scrakk-view`; un path normal → `file`. */
export function schemeOf(path: string): string {
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(path)
  if (!m) return 'file'
  const scheme = m[1].toLowerCase()
  // En Windows `C:\...` parece un esquema: una letra sola no lo es.
  return scheme.length === 1 ? 'file' : scheme
}

/** Glob mínimo (`*` = cualquier cosa, `?` = un char), sin regex exóticas. */
export function matchesGlob(basename: string, glob: string): boolean {
  const pattern = glob
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
    .replace(/\\\?/g, '.')
  return new RegExp(`^${pattern}$`, 'i').test(basename)
}

/** ¿El handler agarra este archivo? */
export function matches(handler: FileHandler, path: string): boolean {
  const m: FileHandlerMatch = handler.match
  if (m.scheme && m.scheme !== schemeOf(path)) return false
  if (m.extensions?.length && !m.extensions.includes(extensionOf(path))) return false
  if (m.globs?.length && !m.globs.some((g) => matchesGlob(baseNameOf(path), g))) return false
  if (m.languageIds?.length) {
    const lang = detectLanguageFromPath(path)
    if (!lang || !m.languageIds.includes(lang)) return false
  }
  return true
}

/** El handler de mayor prioridad que matchea (`null` = ninguno → editor). */
export function pickHandler(handlers: FileHandler[], path: string): FileHandler | null {
  let best: FileHandler | null = null
  for (const handler of handlers) {
    if (!matches(handler, path)) continue
    if (!best || (handler.priority ?? 0) > (best.priority ?? 0)) best = handler
  }
  return best
}
