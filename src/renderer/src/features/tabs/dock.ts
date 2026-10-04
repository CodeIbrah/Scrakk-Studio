// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Estado de "tabs acopladas".
 *
 * Modo de PRESENTACIÓN del contenedor de tabs del centro: en vez de la barra
 * horizontal arriba del contenido, las tabs se ven como LISTA VERTICAL en un
 * panel de la activity bar (`tabs`). El estado de las tabs no cambia: son las
 * mismas; solo cambia dónde se ven.
 *
 * Persiste en localStorage y publica la clave de contexto `tabsDocked` para
 * que el botón de la activity bar (que declara `when: 'tabsDocked'`) aparezca
 * solo cuando el modo está activo.
 *
 * El store es PURO a propósito (sin importar servicios): lo consume tanto el
 * layout como el botón. Quien publica la clave de contexto inyecta su emisor
 * con `bindTabsDockedContext` (ver `buttons/tabs`), para no meter el
 * hostBridge en la cadena de imports del layout (crearía un ciclo con
 * persistence).
 */

export const TABS_DOCKED_CONTEXT_KEY = 'tabsDocked'

const STORAGE_KEY = 'scrakk:tabs-docked'

/** Emisor de claves de contexto (lo inyecta el dueño de la activity bar). */
type ContextPublisher = (key: string, value: unknown) => void

let publisher: ContextPublisher | null = null

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

let docked = readStored()

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch {
      // Un suscriptor roto no tumba a los demás.
    }
  }
}

/**
 * Inyecta el emisor de claves de contexto y publica el valor actual. Se llama
 * UNA vez, desde el módulo que ya tiene el hostBridge (el botón de la barra).
 */
export function bindTabsDockedContext(publish: ContextPublisher): void {
  publisher = publish
  publish(TABS_DOCKED_CONTEXT_KEY, docked)
}

/** ¿Las tabs están acopladas al panel (lista vertical)? */
export function isTabsDocked(): boolean {
  return docked
}

/** Fija el modo. Persiste y publica la clave de contexto (idempotente). */
export function setTabsDocked(next: boolean): void {
  if (docked === next) return
  docked = next
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    // Sin storage: el modo queda solo en memoria esta sesión.
  }
  publisher?.(TABS_DOCKED_CONTEXT_KEY, next)
  emit()
}

export function toggleTabsDocked(): void {
  setTabsDocked(!docked)
}

export function subscribeToTabsDocked(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
