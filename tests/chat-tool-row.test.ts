// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Fila de tool en el chat: hover siempre, click sólo cuando la tool no trae su
 * propio visual.
 *
 * El criterio importa: las tools con `renderBody` (el subagente, los diffs…)
 * ya saben qué hacer al click —el subagente abre su chat en un modal—, así que
 * envolverlas en un botón les pisaría la interacción y abriría DOS modales.
 *
 * Sin entorno DOM, se verifica sobre el código: es lo que se rompe.
 */

import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const src = (rel: string): string =>
  readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const BLOCK = 'src/renderer/src/features/chat/components/ToolCallsBlock/ToolCallsBlock.tsx'
const MODAL = 'src/renderer/src/features/chat/components/ToolCallsBlock/ToolResultModal.tsx'
const CSS = 'src/renderer/src/features/chat/components/ToolCallsBlock/ToolCallsBlock.module.css'

describe('fila de tool: hover y click', () => {
  it('sólo es clickeable si la tool NO trae visual propio', () => {
    const block = src(BLOCK)
    expect(block).toMatch(/const openable = !meta\?\.renderBody/)
    // Y cuando lo es, se renderiza como botón con su clase de hover.
    expect(block).toMatch(/styles\.clickable/)
    expect(block).toMatch(/onClick=\{openResult\}/)
  })

  it('el click abre el resultado en el modal del chat', () => {
    const modal = src(MODAL)
    // Mismo patrón que el chat del subagente: plain dentro del panel de chat.
    expect(modal).toContain("variant: 'plain'")
    expect(modal).toContain("portalSelector: '[data-modal-portal=\"chat\"]'")
    expect(modal).toContain('export function openToolResultModal')
    // Muestra args + salida (y qué hacer si aún corre o no hay salida).
    expect(modal).toContain('chat.tool.argumentos')
    expect(modal).toContain('chat.tool.salida')
  })

  it('la fila clickeable tiene hover real (y no mueve el layout)', () => {
    const css = src(CSS)
    expect(css).toMatch(/\.clickable:hover/)
    expect(css).toMatch(/\.clickable \{/)
    // Reset de botón: si falta, la fila se ve como un botón nativo.
    expect(css).toMatch(/border: none/)
    expect(css).toMatch(/background: transparent/)
    expect(css).toMatch(/cursor: pointer/)
  })
})