// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { ChatMessage } from '@services/chat'
import { memo, useEffect, useRef, type JSX } from 'react'
import { MessageBubble } from '../MessageBubble/MessageBubble'
import { ThinkingState } from '../ThinkingState/ThinkingState'
import { ThoughtBlock } from '../ThoughtBlock/ThoughtBlock'
import styles from './MessageList.module.css'

interface MessageListProps {
  messages: ChatMessage[]
  /** true mientras un stream está en curso (el último mensaje se está armando). */
  isStreaming: boolean
  /** Regenera la última respuesta (el botón solo se muestra en el último mensaje). */
  onRegenerate?: () => void
  /**
   * Guarda la edición de un mensaje. El panel decide qué implica (el usuario
   * reenvía con el texto nuevo; la IA sólo actualiza su contenido).
   */
  onEditMessage?: (messageId: string, content: string) => void
  /** Clase extra sobre el root (p. ej. para acotar el ancho de la columna). */
  className?: string
}

/**
 * Lista scrollable con scroll inteligente:
 * - Al montar (cambio de sesión) va al fondo, donde están los últimos mensajes.
 * - Al crecer, solo sigue al fondo si el usuario ya estaba cerca del fondo.
 *
 * Mientras el modelo piensa (stream sin contenido todavía) se muestra el
 * shimmer "Thinking"; el razonamiento va en el bloque "Thought for Ns".
 *
 * Usa el scrollbar global (réplica de Innerta): sin rail custom.
 */
export const MessageList = memo(function MessageList({
  messages,
  isStreaming,
  onRegenerate,
  onEditMessage,
  className
}: MessageListProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  /**
   * Sonda de huecos (solo DEV).
   *
   * El "Thought" aparecía lejísimos de los tools de la ronda anterior y los
   * `gap` del CSS no lo explicaban. Esto mide el hueco REAL entre mensajes
   * consecutivos y lo reporta cuando pasa de un umbral, con el índice del
   * mensaje: así se ve si el aire es de un margen o de un elemento con altura
   * (un bloque colapsado, un placeholder, un tamaño estimado).
   */
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const el = listRef.current
    if (!el) return
    const handle = requestAnimationFrame(() => {
      const wraps = el.querySelectorAll<HTMLElement>(':scope > div')
      let prevBottom = Number.NaN
      const report: string[] = []
      wraps.forEach((wrap, index) => {
        const rect = wrap.getBoundingClientRect()
        const gap = rect.top - prevBottom
        if (Number.isFinite(gap) && gap > 4) {
          const hasThought = Boolean(wrap.querySelector('[aria-expanded]'))
          const prev = wraps[index - 1]
          report.push(
            `#${index}${hasThought ? '(Thought)' : ''} +${Math.round(gap)}px ` +
              `[prev alto ${Math.round(prev?.getBoundingClientRect().height ?? 0)}px]`
          )
        }
        prevBottom = rect.bottom
      })
      if (report.length > 0) console.warn(`[chat] huecos: ${report.join(' | ')}`)
    })
    return () => cancelAnimationFrame(handle)
  }, [messages])

  // Scroll automático: al montar al fondo; al crecer, solo si está cerca.
  useEffect(() => {
    const el = listRef.current
    if (!el) return

    if (!mountedRef.current) {
      mountedRef.current = true
      el.scrollTop = el.scrollHeight
      return
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 100) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  return (
    <div
      ref={listRef}
      className={className ? `${styles.list} ${className}` : styles.list}
      role="log"
      aria-live="polite"
    >
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1
        const isPending = isLast && message.role === 'assistant' && isStreaming
        const hasReasoning = Boolean(message.role === 'assistant' && message.reasoning)
        // Con tool calls el bubble SÍ se dibuja aunque no haya texto todavía:
        // es lo único que muestra la card de la tool (y el subagente en vivo).
        // Sin esto, mientras la tool corre el panel quedaba clavado en
        // "Thinking" y la card recién aparecía al terminar la ronda (o al
        // apretar Detener, que apaga isStreaming).
        const hasToolCalls = Boolean(message.role === 'assistant' && message.tool_calls?.length)
        const showThinking = isPending && !message.content && !hasToolCalls
        return (
          <div
            key={message.id}
            className={styles.messageWrap}
            // El Thought cancela el gap de arriba: las rondas de un mismo turno
            // son UN bloque, no mensajes independientes (el aire que se veía
            // era el `gap` de la lista entre la ronda de tools y la siguiente).
            data-thought={hasReasoning ? '' : undefined}
          >
            {hasReasoning ? (
              // thinking = está razonando todavía (sin contenido): el header
              // del bloque muestra "Thinking"; al empezar el contenido pasa
              // a "Thought for Ns" con el tiempo que pensó.
              <ThoughtBlock
                reasoning={message.reasoning ?? ''}
                thinking={isPending && !message.content && !hasToolCalls}
              />
            ) : null}
            {showThinking ? (
              // Sin razonamiento visible: el indicador Thinking va solo.
              hasReasoning ? null : <ThinkingState />
            ) : (
              <MessageBubble
                message={message}
                // Mientras el stream arma el mensaje: sin acciones, y sin
                // Regenerar hasta que sea la última respuesta ya terminada.
                pending={isPending}
                onRegenerate={
                  message.role === 'assistant' && isLast && !isPending ? onRegenerate : undefined
                }
                onEditSave={onEditMessage}
                // Editar mientras el modelo genera dejaría dos verdades a la
                // vez: el texto nuevo y el stream en curso.
                canEdit={!isStreaming}
              />
            )}
          </div>
        )
      })}
    </div>
  )
})
