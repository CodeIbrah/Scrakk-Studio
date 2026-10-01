// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Tipo 'fileHandlers' — schema declarativo.
 *
 * Valida el slice `contributes.fileHandlers` del manifest: una extensión puede
 * aportar SUS formatos (una "excepción" por formato) exactamente igual que los
 * built-in del barrel. El `component` es la ruta del visor relativa al paquete.
 */

import type { FileHandlerMatch, FileHandlerMode } from '@features/fileHandlers'
import type { ParseContext } from '../handler'

export interface FileHandlerContribution {
  /** Id único del handler (global entre extensiones). */
  id: string
  /** Qué archivos agarra. */
  match: FileHandlerMatch
  /** view = pieza · text = editor · both = intermedio (con ojo). */
  mode: FileHandlerMode
  /** Mayor gana cuando varios matchean. */
  priority?: number
  /** Ruta del módulo del visor (export default ComponentType). */
  component?: string
}

const MODES: readonly string[] = ['view', 'text', 'both']

function parseMatch(raw: unknown): FileHandlerMatch | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const match: FileHandlerMatch = {}
  const asStrings = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined
    const out = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    return out.length > 0 ? out : undefined
  }
  match.extensions = asStrings(r.extensions)?.map((ext) => ext.replace(/^\./, '').toLowerCase())
  match.globs = asStrings(r.globs)
  match.languageIds = asStrings(r.languageIds)
  if (typeof r.scheme === 'string' && r.scheme) match.scheme = r.scheme.toLowerCase()
  // Sin ninguna condición el handler agarraría TODO: se descarta.
  if (!match.extensions && !match.globs && !match.languageIds && !match.scheme) return null
  return match
}

export function parseFileHandlerContributions(
  raw: unknown,
  _ctx: ParseContext
): FileHandlerContribution[] | null {
  if (!Array.isArray(raw)) return null
  const out: FileHandlerContribution[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const c = item as Partial<FileHandlerContribution>
    const match = parseMatch(c.match)
    if (typeof c.id !== 'string' || !c.id || !match) {
      console.warn('[extensions/fileHandlers] contribución inválida descartada:', c)
      continue
    }
    const mode: FileHandlerMode = MODES.includes(c.mode ?? '') ? (c.mode as FileHandlerMode) : 'text'
    out.push({
      id: c.id,
      match,
      mode,
      priority: typeof c.priority === 'number' ? c.priority : undefined,
      component: typeof c.component === 'string' ? c.component : undefined
    })
  }
  return out
}
