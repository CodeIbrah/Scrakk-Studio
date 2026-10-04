// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Modo PC mala — switch global de bajo consumo.
 *
 * Persistente (`scrakk:low-end-mode`) + suscripción. Lo consumen:
 * - fileSession: tope de módulos background 6 → 2.
 * - semanticTokensBridge: sin tokens LSP (como 'treesitter').
 * - hostBridge: sin hover LSP (sin dwell ni requests).
 * - Aviso de heap: umbrales a la mitad.
 */

export const LOW_END_STORAGE_KEY = 'scrakk:low-end-mode'

type Listener = () => void

const listeners = new Set<Listener>()

function emit(): void {
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      // Un suscriptor roto no debe tumbar a los demás.
    }
  }
}

function load(): boolean {
  try {
    return localStorage.getItem(LOW_END_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

let enabled = load()

export function subscribeLowEndMode(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isLowEndMode(): boolean {
  return enabled
}

export function setLowEndMode(value: boolean): void {
  if (enabled === value) return
  enabled = value
  try {
    localStorage.setItem(LOW_END_STORAGE_KEY, value ? '1' : '0')
  } catch {
    // Sin almacenamiento: queda solo en memoria esta sesión.
  }
  emit()
}

/** Solo tests: resetea el singleton. */
export function resetLowEndModeForTests(): void {
  enabled = false
  try {
    localStorage.removeItem(LOW_END_STORAGE_KEY)
  } catch {
    // no-op
  }
}

// ── Animación gelatinosa de nodos de terminal ──────────────────────────
// `true` = muelle con overshoot al mover grupos; `false` = directo, sin rAF.
// Persistente (`scrakk:term-nodes-jelly`), por defecto activada.
export const NODE_JELLY_STORAGE_KEY = 'scrakk:term-nodes-jelly'

const jellyListeners = new Set<Listener>()

function emitJelly(): void {
  for (const listener of jellyListeners) {
    try {
      listener()
    } catch {
      // no-op
    }
  }
}

function loadJelly(): boolean {
  try {
    return localStorage.getItem(NODE_JELLY_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

let jellyEnabled = loadJelly()

export function subscribeNodeJelly(listener: Listener): () => void {
  jellyListeners.add(listener)
  return () => {
    jellyListeners.delete(listener)
  }
}

export function isNodeJellyEnabled(): boolean {
  return jellyEnabled
}

export function setNodeJellyEnabled(value: boolean): void {
  if (jellyEnabled === value) return
  jellyEnabled = value
  try {
    localStorage.setItem(NODE_JELLY_STORAGE_KEY, value ? '1' : '0')
  } catch {
    // Sin almacenamiento: queda solo en memoria esta sesión.
  }
  emitJelly()
}
