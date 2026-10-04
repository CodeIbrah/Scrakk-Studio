// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Tests del estado "tabs acopladas": cambio, notificación y publicación de la
 * clave de contexto que condiciona el botón `tabs` de la activity bar.
 */

import { describe, it, expect, beforeEach } from 'vitest'

import {
  isTabsDocked,
  setTabsDocked,
  toggleTabsDocked,
  subscribeToTabsDocked,
  bindTabsDockedContext,
  TABS_DOCKED_CONTEXT_KEY
} from '../src/renderer/src/features/tabs/dock'

beforeEach(() => {
  setTabsDocked(false)
})

describe('tabs dock — estado', () => {
  it('arranca desacoplado y cambia con set/toggle', () => {
    expect(isTabsDocked()).toBe(false)
    setTabsDocked(true)
    expect(isTabsDocked()).toBe(true)
    toggleTabsDocked()
    expect(isTabsDocked()).toBe(false)
  })

  it('set idempotente NO notifica', () => {
    let calls = 0
    const unsub = subscribeToTabsDocked(() => calls++)
    setTabsDocked(false)
    expect(calls).toBe(0)
    setTabsDocked(true)
    expect(calls).toBe(1)
    unsub()
  })
})

describe('tabs dock — clave de contexto', () => {
  it('publica el valor actual al conectar y en cada cambio', () => {
    const published: Array<[string, unknown]> = []
    bindTabsDockedContext((key, value) => published.push([key, value]))
    // Al conectar publica el estado actual (false).
    expect(published).toEqual([[TABS_DOCKED_CONTEXT_KEY, false]])
    setTabsDocked(true)
    expect(published).toEqual([
      [TABS_DOCKED_CONTEXT_KEY, false],
      [TABS_DOCKED_CONTEXT_KEY, true]
    ])
  })
})
