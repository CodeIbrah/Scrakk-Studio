// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Interacción de la fila de una tool: hover siempre, click → resultado en modal.
 *
 * ARQUITECTURA (esto es lo que se rompió la primera vez): el **shell** provee el
 * comportamiento y **cada tool declara** el suyo desde su propia carpeta. La
 * primera versión decidía en el bloque del chat mirando `renderBody` — y como
 * casi todas las tools (27) traen visual propio, la condición `!renderBody`
 * dejaba a todas afuera y ninguna era clickeable. Nada de eso puede volver a
 * decidirse en el centro.
 */

import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const src = (rel: string): string =>
  readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const SHELL = 'src/renderer/src/services/ai/tool-shell/ToolCallShell.tsx'
const SHELL_CSS = 'src/renderer/src/services/ai/tool-shell/ToolCallShell.module.css'
const MODAL = 'src/renderer/src/services/ai/tool-shell/ToolResultModal.tsx'
const TYPES = 'src/renderer/src/services/ai/tools/types.ts'
const TASK = 'src/renderer/src/services/ai/tools/task/index.tsx'
const BLOCK = 'src/renderer/src/features/chat/components/ToolCallsBlock/ToolCallsBlock.tsx'

describe('fila de tool: el shell provee, la tool declara', () => {
  it('el contrato existe y es declarativo', () => {
    const types = src(TYPES)
    expect(types).toContain('export interface ToolOpenContext')
    // Sin declarar = resultado genérico; 'self' = la tool maneja su click.
    expect(types).toMatch(/onOpen\?:\s*'self' \| \(\(ctx: ToolOpenContext\) => void\)/)
  })

  it('el shell es quien pone el hover y el click (no el bloque del chat)', () => {
    const shell = src(SHELL)
    expect(shell).toMatch(/const openSelf = onOpen === 'self'/)
    expect(shell).toMatch(/const clickable = !openSelf/)
    expect(shell).toMatch(/<button type="button" className=\{styles\.row\}/)
    // Con handler propio se respeta; si no, va el modal de resultado.
    expect(shell).toContain('openCustom({')
    expect(shell).toContain('openToolResultModal({')

    const css = src(SHELL_CSS)
    expect(css).toMatch(/\.row:hover/)
    expect(css).toMatch(/cursor: pointer/)
  })

  it('el bloque del chat NO decide la interacción (nada hardcodeado)', () => {
    const block = src(BLOCK)
    // La condición que dejó a las 27 tools sin click, y su botón, ya no están.
    expect(block).not.toContain('!meta?.renderBody')
    expect(block).not.toContain('openToolResultModal')
    expect(block).not.toMatch(/styles\.clickable/)
    // Solo delega en el shell.
    expect(block).toContain('<ToolCallShell')
  })

  it('la tool que ya es clickeable lo declara en SU carpeta', () => {
    const task = src(TASK)
    // El subagente abre su propio chat: lo dice su manifest, no el chat.
    expect(task).toMatch(/onOpen: 'self'/)
  })

  it('el modal del resultado sale de la infraestructura de tools', () => {
    const modal = src(MODAL)
    expect(modal).toContain('export function openToolResultModal')
    expect(modal).toContain("variant: 'plain'")
    expect(modal).toContain("portalSelector: '[data-modal-portal=\"chat\"]'")
    // Exportado por el barrel para que cualquier consumidor lo use.
    expect(src('src/renderer/src/services/ai/tool-shell/index.ts')).toContain(
      'openToolResultModal'
    )
  })
})