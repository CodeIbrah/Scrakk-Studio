// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Acumulación de tool calls del stream SSE.
 *
 * El contrato de OpenAI dice que `index` es la POSICIÓN en el array y que los
 * chunks siguientes de la misma call repiten el index OMITIENDO el id. Pero
 * hay providers/gateways no-conformantes que repiten el `id` con el index
 * incrementado en cada chunk: acumular por index creaba N entradas con el
 * MISMO id → N cards idénticas (y una sola ejecución, porque el dedup de
 * ejecución sí usa el id).
 *
 * Regla: identidad por `id`, dedup por `id` al emitir. Estas funciones son
 * puras y viven acá para poder testearlas sin levantar el IPC.
 */

import type { LlmToolCall } from '@shared/llm'

/** Un delta crudo de `choices[0].delta.tool_calls[]`. */
export interface StreamToolCallDelta {
  index?: number
  id?: string
  function?: { name?: string | null; arguments?: string | null }
}

/** Slots acumulados por el handler del stream (con huecos por index). */
export type StreamToolCallSlots = Array<LlmToolCall | undefined>

/**
 * Aplica los deltas de un chunk sobre los slots acumulados.
 * Muta `slots` (el mismo array que el handler del stream).
 */
export function accumulateToolCallDeltas(
  slots: StreamToolCallSlots,
  deltas: StreamToolCallDelta[]
): void {
  for (const tc of deltas) {
    const index = tc.index ?? 0

    if (tc.id) {
      // Identidad por `id`, NO por `index`.
      const slot = slots.findIndex((entry) => entry?.id === tc.id)
      if (slot < 0) {
        // Primer chunk de esta call: se abre en su slot.
        slots[index] = {
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function?.name ?? '',
            arguments: tc.function?.arguments ?? ''
          }
        }
        continue
      }
      // Chunk posterior de una call ya conocida: se acumula SIEMPRE en su
      // slot, sin importar el index que mande el provider.
      const current = slots[slot]!
      if (tc.function?.name) current.function.name = tc.function.name
      if (tc.function?.arguments) current.function.arguments += tc.function.arguments
      continue
    }

    // Chunk de continuación sin id: mismo slot por index; si el provider
    // barrió el index (no-conformante), se acumula en la última call abierta
    // en vez de perderse.
    let slot = slots[index] ? index : -1
    if (slot < 0) {
      for (let i = slots.length - 1; i >= 0; i -= 1) {
        if (slots[i]) {
          slot = i
          break
        }
      }
    }
    const current = slot >= 0 ? slots[slot] : undefined
    if (current) {
      if (tc.function?.name) current.function.name = tc.function.name
      if (tc.function?.arguments) current.function.arguments += tc.function.arguments
    }
  }
}

/**
 * Slots → lista sin huecos y deduplicada por `id`.
 *
 * Descarta las entradas SIN `function.name`: un chunk con `id` nuevo pero sin
 * nombre no puede abrir una tool call (por spec el primer chunk trae id +
 * nombre). Algunos gateways re-emiten los argumentos bajo un id nuevo sin
 * nombre: eso creaba una card fantasma, que además no se podía ejecutar (name
 * vacío) y no era clickeable — la "duplicada no clickeable".
 */
export function finalizedToolCalls(slots: StreamToolCallSlots): LlmToolCall[] {
  const seen = new Set<string>()
  const unique: LlmToolCall[] = []
  for (const tc of slots) {
    if (!tc) continue
    if (!tc.function.name) continue
    if (tc.id && seen.has(tc.id)) continue
    if (tc.id) seen.add(tc.id)
    unique.push(tc)
  }
  return unique
}
