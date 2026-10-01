// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Preferencia por archivo: ¿se ve como PIEZA (view) o como TEXTO (text)?
 *
 * Solo aplica a los handlers `mode: 'both'` (markdown, svg…). El ojo de la tab
 * la alterna. Se persiste en localStorage (mapa path → modo) igual que el
 * minimapa: lectura barata, sin tocar el storage service.
 */

import type { FileHandler } from './types'

const STORAGE_KEY = 'fileHandlers.mode'

export type FileViewMode = 'view' | 'text'

type ModeMap = Record<string, FileViewMode>

/** Notifica cambios de preferencia (lo usa el dispatcher para re-renderizar). */
const listeners = new Set<() => void>()

export function subscribeToPreferredModes(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch {
      // Un suscriptor roto no debe tumbar a los demás.
    }
  }
}

function read(): ModeMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ModeMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(map: ModeMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Sin storage: la preferencia vive solo en memoria de esta sesión.
  }
}

export function getPreferredMode(path: string): FileViewMode | null {
  return read()[path] ?? null
}

export function setPreferredMode(path: string, mode: FileViewMode): void {
  const map = read()
  map[path] = mode
  write(map)
  emit()
}

/**
 * Modo efectivo para un archivo:
 *  - sin handler           → texto (lo abre el editor, como siempre).
 *  - `mode: 'view'`        → pieza (una imagen no se edita).
 *  - `mode: 'text'`        → editor.
 *  - `mode: 'both'`        → lo que eligió el usuario; default: visor.
 */
export function effectiveMode(handler: FileHandler | null, path: string): FileViewMode {
  if (!handler) return 'text'
  if (handler.mode === 'view') return 'view'
  if (handler.mode === 'text') return 'text'
  return getPreferredMode(path) ?? 'view'
}

/** ¿Tiene sentido ofrecer el ojo? (el formato admite los dos modos). */
export function canToggleMode(handler: FileHandler | null): boolean {
  return handler?.mode === 'both'
}
