// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Lista de mensajes — anclaje, degradado del borde y scroll al enviar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ SE PRUEBA Y POR QUÉ
 *
 * Todo esto es geometría que no da error cuando se rompe, sólo se ve mal:
 *
 *   1. el padding inferior tiene que medir lo MISMO que el degradado — si se
 *      separan, el degradado se come el final del último mensaje (o queda un
 *      hueco muerto),
 *   2. la conversación se ancla ARRIBA (una charla corta arranca del borde
 *      superior), y
 *   3. mandar un mensaje propio SIEMPRE baja, aunque estuvieras leyendo
 *      historial — si no, mandás y no ves lo que mandaste.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (rel: string): string =>
  readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const LIST_CSS = 'src/renderer/src/features/chat/components/MessageList/MessageList.module.css'
const LIST_TSX = 'src/renderer/src/features/chat/components/MessageList/MessageList.tsx'

/** El bloque `.list { … }` (no `.listX`). */
function listBlock(): string {
  const css = read(LIST_CSS)
  const start = css.indexOf('.list {')
  return css.slice(start, css.indexOf('}', start))
}

describe('lista de mensajes', () => {
  it('el padding inferior mide lo mismo que el degradado', () => {
    const block = listBlock()
    expect(block).toContain('--chat-edge-fade:')
    // Las dos puntas del invariante usan la MISMA variable.
    expect(block).toMatch(/padding:[^;]*var\(--chat-edge-fade\)/)
    expect(block).toMatch(/mask-image:[^;]*var\(--chat-edge-fade\)/)
  })

  it('lo que sale por abajo se desvanece (máscara, no un overlay de color)', () => {
    const block = listBlock()
    expect(block).toContain('mask-image: linear-gradient(to top, transparent')
    // Overlay descartado a propósito: el panel es transparente y el tema puede
    // traer imagen de fondo, así que no hay un color con el que tapar.
    expect(block).toContain('-webkit-mask-image')
  })

  it('la conversación se ancla ARRIBA', () => {
    const block = listBlock()
    expect(block).toContain('flex-direction: column')
    // Cualquier alineación al final acá abajo manda la charla corta pegada al
    // composer. Se miran las DECLARACIONES: los comentarios pueden nombrarlo.
    expect(block).not.toMatch(/justify-content:\s*flex-end/)
    expect(block).not.toMatch(/align-items:\s*flex-end/)
  })

  it('mandar un mensaje propio siempre baja (ver lo que mandaste)', () => {
    const src = read(LIST_TSX)
    expect(src).toContain("last?.role === 'user'")
    expect(src).toContain('el.scrollTop = el.scrollHeight')
  })

  it('se ancla SOLO la última pregunta (nunca la anterior)', () => {
    const src = read(LIST_TSX)
    // Los mensajes se agrupan en TURNOS: el tuyo + lo que vino después.
    expect(src).toContain('const turns:')
    expect(src).toContain("message.role === 'user' || turns.length === 0")
    // El ancla sale de la ÚLTIMA pregunta, no de todas.
    expect(src).toContain('let lastUserId')
    expect(src).toContain('message.id === lastUserId')
    const css = read(LIST_CSS)
    const block = css.slice(css.indexOf('.anchor {'), css.indexOf('}', css.indexOf('.anchor {')))
    expect(block).toContain('position: sticky')
    expect(block).toContain('top: 0')
    // Es un hermano ANTERIOR: sin z-index, la respuesta se pinta encima.
    expect(block).toContain('z-index: 1')
    // El turno le pone el límite al sticky.
    expect(css).toMatch(/\.turn \{[\s\S]*?display: flex/)
  })

  it('el ancla es PURA CSS: nada que recalcular en el scroll', () => {
    const src = read(LIST_TSX)
    // Con un listener que cambiaba la clase del ancla, el nuevo elemento se
    // teleportaba al tope y parpadeaba, y cada evento sumaba trabajo.
    expect(src).not.toContain("addEventListener('scroll'")
    expect(src).not.toContain('anchorId')
  })
})
