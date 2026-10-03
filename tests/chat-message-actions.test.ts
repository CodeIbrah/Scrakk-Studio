// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Acciones del mensaje (copiar / editar) en los DOS roles.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ SE PRUEBA Y POR QUÉ
 *
 * La barra de acciones existía sólo para la IA y sin editar, así que lo que se
 * rompe en silencio es:
 *
 *   1. el rol — la barra tiene que salir en el mensaje del usuario TAMBIÉN, y
 *      basta con dejar un `!isUser` en la condición para que desaparezca,
 *   2. la edición del usuario — si guarda pero no REENVÍA, el chat queda con
 *      una pregunta editada y una respuesta que contesta a la anterior, y
 *   3. los textos — una clave i18n sin traducir sale como la clave cruda.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (rel: string): string =>
  readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const BUBBLE = 'src/renderer/src/features/chat/components/MessageBubble/MessageBubble.tsx'
const ACTIONS = 'src/renderer/src/features/chat/components/MessageActions/MessageActions.tsx'
const LIST = 'src/renderer/src/features/chat/components/MessageList/MessageList.tsx'
const PANEL = 'src/renderer/src/features/layout/panels/ChatPanel/ChatPanel.tsx'

describe('la barra de acciones sale en los dos roles', () => {
  it('la condición no distingue usuario de IA', () => {
    const src = read(BUBBLE)
    // Un `!isUser` acá es exactamente el bug que esto fija.
    expect(src).toContain('const showActions = !editing && !pending && !hasToolCalls && hasText')
  })

  it('copiar y editar van juntos en la barra', () => {
    const src = read(ACTIONS)
    expect(src).toContain('onEdit?: () => void')
    expect(src).toMatch(/\{onEdit \? \(/)
    // El botón usa un ícono del pack, no un glifo suelto.
    expect(src).toContain('id="pencil"')
  })
})

describe('editar es funcional, no decorativo', () => {
  it('el mensaje se edita en el lugar (textarea + guardar/cancelar)', () => {
    const src = read(BUBBLE)
    expect(src).toContain('styles.editArea')
    expect(src).toMatch(/<textarea/)
    expect(src).toContain('onEditSave?.(message.id, next)')
    // Vacío no se guarda (el editor queda abierto para corregirlo).
    expect(src).toMatch(/if \(!next\) return/)
  })

  it('editar sólo se ofrece cuando el panel puede (no en medio del stream)', () => {
    const bubble = read(BUBBLE)
    expect(bubble).toContain('onEdit={canEdit && onEditSave ? startEdit : undefined}')
    expect(read(LIST)).toContain('canEdit={!isStreaming}')
  })

  it('editar un mensaje del USUARIO reenvía (lo de después ya no responde a ese texto)', () => {
    const src = read(PANEL)
    const start = src.indexOf('const handleEditMessage')
    expect(start).toBeGreaterThan(-1)
    const end = src.indexOf('\n  )', start)
    const body = src.slice(start, end === -1 ? undefined : end)

    expect(body).toContain('updateMessage(sessionId, messageId')
    // Sólo el usuario reenvía; la respuesta de la IA únicamente se actualiza.
    expect(body).toContain("if (edited.role !== 'user') return")
    expect(body).toContain('removeMessagesAfter(sessionId, index + 1)')
    expect(body).toContain('streamReply(sessionId, content, current.slice(0, index))')
  })

  it('el callback no depende de `messages`: rompería el memo de TODAS las burbujas', () => {
    // `messages` cambia en cada token del stream. Si el handler (que se pasa a
    // cada mensaje) dependiera de él, su identidad cambiaría por token y cada
    // burbuja re-parsearía su markdown: justo lo que el memo evita.
    const src = read(PANEL)
    const start = src.indexOf('const handleEditMessage')
    const end = src.indexOf('\n  )', start)
    const body = src.slice(start, end === -1 ? undefined : end)
    expect(body).toContain('messagesRef.current')
    expect(body).not.toMatch(/\[sessionId, isBusy, messages/)
  })

  it('el panel le pasa el handler a la lista', () => {
    expect(read(PANEL)).toContain('onEditMessage={handleEditMessage}')
  })
})

describe('los textos existen en los dos idiomas', () => {
  const keys = ['chat.editar', 'chat.editar.mensaje', 'chat.guardar.cambios', 'chat.cancelar.edicion']

  it.each(keys)('%s está en es y en en', (key) => {
    for (const locale of ['es', 'en']) {
      const catalog = JSON.parse(
        read(`src/shared/i18n/catalogs/${locale}/chat.json`)
      ) as Record<string, string>
      expect(catalog[key]?.length ?? 0).toBeGreaterThan(0)
    }
  })
})
