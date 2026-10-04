// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Modales de tools: cada tool que abre el modal genérico (sin `onOpen`) tiene
 * que declarar su cuerpo (`meta.modal`, la carpeta `modal/`). Las que eligen
 * otra interacción — diffs (`onOpen` función) o su propio chat (`'self'`) — no
 * lo necesitan.
 */

import { describe, it, expect } from 'vitest'
import '../src/renderer/src/services/ai/tools/index'
import { registry } from '../src/renderer/src/services/ai/tools/registry'

describe('tool modals', () => {
  it('toda tool que abre el modal genérico declara su cuerpo', () => {
    const missing: string[] = []
    for (const name of registry.getNames()) {
      const meta = registry.get(name)?.meta
      if (!meta) continue
      // `onOpen` ausente = el shell abre el modal de resultado.
      if (meta.onOpen !== undefined) continue
      if (typeof meta.modal !== 'function') missing.push(name)
    }
    expect(missing, `tools sin modal/: ${missing.join(', ')}`).toEqual([])
  })
})
